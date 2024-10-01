// backend/routes/account.js
const express = require('express');
const { authMiddleware } = require('../middleware');
const { Account } = require('../db');

const router = express.Router();

router.get("/balance", authMiddleware, async (req, res) => {
    try {
        const account = await Account.findOne({ userId: req.userId });

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        res.json({
            balance: account.balance
        });
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/transfer", authMiddleware, async (req, res) => {
    const { amount, to } = req.body;

    try {
        // Step 1: Find the sender's account and ensure sufficient balance
        const account = await Account.findOne({ userId: req.userId });

        if (!account) {
            return res.status(404).json({ message: "Sender account not found" });
        }

        if (account.balance < amount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // Step 2: Find the recipient's account
        const toAccount = await Account.findOne({ userId: to });

        if (!toAccount) {
            return res.status(404).json({ message: "Recipient account not found" });
        }

        // Step 3: Perform the transfer using atomic updates
        // Deduct from sender's account
        const updatedSenderAccount = await Account.updateOne(
            { userId: req.userId, balance: { $gte: amount } }, // Ensure the balance is still sufficient
            { $inc: { balance: -amount } }
        );

        if (updatedSenderAccount.nModified === 0) {
            return res.status(400).json({ message: "Transfer failed: insufficient funds" });
        }

        // Add to recipient's account
        await Account.updateOne(
            { userId: to },
            { $inc: { balance: amount } }
        );

        // Step 4: Send success response
        res.json({ message: "Transfer successful" });

    } catch (error) {
        console.error("Error during transfer:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;


// transactions and sessions code below doesnt work on standalone mongodb nodes

// const express = require("express");
// const { authMiddleware } = require("../middleware");
// const { Account } = require("../db");
// const mongoose = require("mongoose");

// const router = express.Router();

// router.get("/balance", authMiddleware, async (req, res) => {
//   const account = await Account.findOne({
//     userId: req.userId,
//   });

//   res.json({
//     balance: account.balance,
//   });
// });

// router.post("/transfer", authMiddleware, async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   const { amount, to } = req.body;

//   // Don't allow transfer to oneself
//   if (to === req.userId) {
//     await session.abortTransaction();
//     return res.json({ message: "Cannot Transfer to yourself!" });
//   }

//   // Fetch the accounts within transaction
//   const account = await Account.findOne({
//     userId: req.userId,
//   }).session(session);

//   if (!account || account.balance < amount) {
//     await session.abortTransaction();
//     return res.status(400).json({
//       message: "Insufficient balance",
//     });
//   }

//   // Fetch the accounts within transaction
//   const toAccount = await Account.findOne({
//     userId: to,
//   }).session(session);

//   if (!toAccount) {
//     await session.abortTransaction();
//     return res.status(400).json({
//       message: "Invalid account",
//     });
//   }

//   // Perform the transfer within transaction
//   await Account.updateOne(
//     { userId: req.userId },
//     { $inc: { balance: -amount } }
//   ).session(session);
//   await Account.updateOne(
//     { userId: to },
//     { $inc: { balance: amount } }
//   ).session(session);

//   // Commit Transaction
//   await session.commitTransaction();

//   res.json({
//     message: "Transfer successful",
//   });
// });

// module.exports = router;
