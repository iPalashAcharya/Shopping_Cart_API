const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/cart', async (req, res) => {
    const client = await pool.connect();
    try {
        const session_id = req.sessionID;
        const user_id = req.session.userId || null; //check if the user is logged in otherwise null and its a guest cart
        const result = await client.query(`INSERT INTO cart (user_id, session_id, created_at, updated_at, expires_at) VALUES ($1, $2, NOW(), NOW(), NOW() + INTERVAL '1 day') RETURNING cart_id`, [user_id, session_id]);
        req.session.cartId = result.rows[0].cart_id; //saving user cart id in the session to fetch it easily
        res.status(201).json({ cart_id: result.rows[0].cart_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Cart creation failed' });
    } finally {
        client.release();
    }
});

//getting full cart details
router.get('/', async (req, res) => {
    const cart_id = req.session.cartId;
    if (!cart_id) return res.status(404).json({ error: 'No cart found' });
    const client = await pool.connect();
    try {
        const result = await client.query(`SELECT ci.cart_item_id, ci.product_id, ci.variant_id, ci.quantity, p.price AS current_price, (p.price * ci.quantity) AS line_total, ci.metadata FROM cart_item ci JOIN product p ON ci.product_id = p.product_id WHERE ci.cart_id = $1`, [cart_id]);
        const items = result.rows;
        const subtotal = items.reduce((acc, item) => acc + parseFloat(item.line_total), 0); //reduce reduces elements of items array to a single value ie the subtotal, start with accumulator=0
        const taxRate = 0.1; // 10% flat tax
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        res.json({ cart_id, items, subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: total.toFixed(2) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cart' });
    } finally {
        client.release();
    }
});

router.post('/cart/:id/items', async (req, res) => {
    const { productId, variantId, quantity, metadata } = req.body; //not taking price from the client for security
    const client = await pool.connect();
    try {
        const productPriceResult = await client.query(`SELECT price FROM product WHERE product_id = $1`, [productId]);
        const livePrice = productPriceResult.rows[0]?.price;
        const inv = await client.query(`SELECT inventory FROM product WHERE product_id = $1`, [productId]);
        if (inv.rows[0]?.inventory < quantity) {
            return res.status(400).json({ error: 'Not enough inventory' });
        }
        const result = await client.query("INSERT INTO cart_item(cart_id,product_id,variant_id,quantity,price_at_time,metadata) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [req.params.id, productId, variantId, quantity, livePrice, metadata]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add item to cart' });
    } finally {
        client.release();
    }
});

//session-based adding items in cart
router.post('/items', async (req, res) => {
    const cartId = req.session.cartId;
    if (!cartId) return res.status(400).json({ error: 'No active cart' });
    const { productId, variantId, quantity, metadata } = req.body;
    const client = await pool.connect();
    try {
        const productPriceResult = await client.query(`SELECT price FROM product WHERE product_id = $1`, [productId]);
        const livePrice = productPriceResult.rows[0]?.price;
        const inv = await client.query(`SELECT inventory FROM product WHERE product_id = $1`, [productId]);

        if (inv.rows[0]?.inventory < quantity) {
            return res.status(400).json({ error: 'Not enough inventory' });
        }
        const result = await client.query(`INSERT INTO cart_item (cart_id, product_id, variant_id, quantity, price_at_time, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [cartId, productId, variantId, quantity, livePrice, metadata || null]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add item to cart' });
    } finally {
        client.release();
    }
});

router.put('/cart/:id/items/:itemId', async (req, res) => {
    const client = await pool.connect();
    try {
        const result1 = await client.query("SELECT metadata,quantity FROM cart_item WHERE cart_item_id = $1 AND cart_id = $2", [req.params.itemId, req.params.id]);
        const existingMetadata = result1.rows[0].metadata;
        const existingQuantity = result1.rows[0].quantity;
        const metadata = req.body.metadata || existingMetadata;
        const quantity = req.body.quantity || existingQuantity;
        const result = await client.query(`UPDATE cart_item SET quantity = $1, metadata = $2 WHERE cart_id = $3 AND cart_item_id = $4 RETURNING *`, [quantity, metadata, req.params.id, req.params.itemId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update cart item' });
    } finally {
        client.release();
    }
});

router.delete('/cart/:id/items/:itemId', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM cart_item WHERE cart_id = $1 AND cart_item_id = $2`, [req.params.id, req.params.itemId]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to remove cart item' });
    } finally {
        client.release();
    }
});

router.delete('/cart/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM cart_item WHERE cart_id = $1`, [req.params.id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to clear cart' });
    } finally {
        client.release();
    }
});
//session-based cart deletion
router.delete('/cart', async (req, res) => {
    const cartId = req.session.cartId
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM cart_item WHERE cart_id = $1`, [cartId]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

module.exports = router;