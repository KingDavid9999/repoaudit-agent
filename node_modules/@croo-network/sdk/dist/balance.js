"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkERC20Balance = checkERC20Balance;
const ethers_1 = require("ethers");
const errors_1 = require("./errors");
const DEFAULT_RPC_URL = 'https://mainnet.base.org';
async function checkERC20Balance(rpcURL, walletAddr, tokenAddr, priceStr) {
    if (!walletAddr || !tokenAddr || !priceStr)
        return;
    const price = BigInt(priceStr);
    if (price <= 0n)
        return;
    const provider = new ethers_1.ethers.JsonRpcProvider(rpcURL || DEFAULT_RPC_URL);
    const erc20 = new ethers_1.ethers.Contract(tokenAddr, ['function balanceOf(address) view returns (uint256)'], provider);
    const balance = await erc20.balanceOf(walletAddr);
    if (balance < price) {
        throw new errors_1.InsufficientBalanceError(tokenAddr, price, balance);
    }
}
