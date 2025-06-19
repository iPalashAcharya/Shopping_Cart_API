const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { pool } = require('../db');

// Register
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING user_id',
            [email, hash]
        );
        res.status(201).json({ message: 'User registered', user_id: result.rows[0].user_id });
    } catch (err) {
        if (err.code === '23505') { //postgresql unique constraint violated
            res.status(409).json({ error: 'Email already in use' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const guestCart = await client.query(
            'SELECT * FROM cart WHERE session_id = $1 AND user_id IS NULL',
            [req.sessionID]
        ); //looking for a cart associated with the current session not tied to a user_id

        let userCartId;
        if (guestCart.rows.length) {
            const guestCartId = guestCart.rows[0].cart_id;
            const userCart = await client.query('SELECT * FROM cart WHERE user_id = $1', [user.user_id]); //checking if logged in user has a cart in the db

            if (userCart.rows.length === 0) { //no cart for logged in user only guest cart
                await client.query('UPDATE cart SET user_id = $1 WHERE cart_id = $2', [user.user_id, guestCartId]); //the session guest cart now belongs to the logged in user
                userCartId = guestCartId;
            } else { //already a cart is present with a user_id
                userCartId = userCart.rows[0].cart_id;
                await client.query('UPDATE cart_item SET cart_id = $1 WHERE cart_id = $2', [userCartId, guestCartId]); //move all items from the guest cart ie the cart when the user was logged out to be in the user's og cart
                await client.query('DELETE FROM cart WHERE cart_id = $1', [guestCartId]); //delete the guest cart when user was logged out
            }
        }

        req.session.userId = user.user_id; //keeps the user logged in across different requests
        if (userCartId) req.session.cartId = userCartId; //saving user cart id in the session to fetch it easily if the user/guest has or had created any cart
        res.json({ message: 'Logged in successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    } finally {
        client.release();
    }
});

module.exports = router;