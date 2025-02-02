const { ethers } = require("ethers");
const IERC20 = require("@openzeppelin/contracts/build/contracts/IERC20.json");

// 从合约源码中定义 SwapRouter 的 exactInputSingle 接口
const SWAP_ROUTER_ABI = [
    "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

// Configuration
const CONFIG = {
    PROVIDER_URL: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    PRIVATE_KEY: "0x0ed0c32803ecf126ba91b65a0a83235bd5e2a6aee5d17ca6676c6780b8328dff",
    TOKEN_A: "0xBbBec56eE46591E82507cbCb895f1663D7d72d2f",
    TOKEN_B: "0x1ba48dCE16a2101af63bfBF1d132D3b137ABA8EA",
    ROUTER: "0xD7041bC7DF95E9Ec1c314AEc1EAC282dFc0A7c68",
    FEE_TIER: 3000
};

const provider = new ethers.providers.JsonRpcProvider(CONFIG.PROVIDER_URL);
const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

// 确保 token0 地址小于 token1 地址
const [TOKEN0, TOKEN1] = ethers.BigNumber.from(CONFIG.TOKEN_A).lt(CONFIG.TOKEN_B)
    ? [CONFIG.TOKEN_A, CONFIG.TOKEN_B]
    : [CONFIG.TOKEN_B, CONFIG.TOKEN_A];

async function approveToken(tokenAddress, spender, amount) {
    const token = new ethers.Contract(tokenAddress, IERC20.abi, wallet);
    console.log(`Approving ${spender} to spend ${tokenAddress}`);
    // const tx = await token.approve(spender, amount);
    // await tx.wait();
    console.log(`Approval confirmed for ${tokenAddress}`);
}

async function performSwap() {
    // 使用精简的 ABI 创建合约实例
    const router = new ethers.Contract(CONFIG.ROUTER, SWAP_ROUTER_ABI, wallet);

    // 使用 parseUnits 处理代币金额
    const amountIn = ethers.utils.parseUnits("1", 18);
    await approveToken(TOKEN0, CONFIG.ROUTER, amountIn);

    // 根据合约定义的结构构造参数
    const params = {
        tokenIn: TOKEN0,
        tokenOut: TOKEN1,
        fee: CONFIG.FEE_TIER,
        recipient: wallet.address,
        // deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20分钟后过期
        amountIn: amountIn,
        amountOutMinimum: ethers.constants.Zero,
        sqrtPriceLimitX96: ethers.constants.Zero
    };

    console.log("Swap parameters:", {
        ...params,
        amountIn: ethers.utils.formatUnits(params.amountIn, 18),
        amountOutMinimum: params.amountOutMinimum.toString(),
        sqrtPriceLimitX96: params.sqrtPriceLimitX96.toString()
    });

    try {
        // 调用 exactInputSingle 函数
        const tx = await router.exactInputSingle(params, {
            gasLimit: ethers.utils.hexlify(1000000),
            value: 0
        });

        const receipt = await tx.wait();
        console.log("Swap completed. Transaction hash:", receipt.transactionHash);

        // 获取交换后的代币余额
        const token0Contract = new ethers.Contract(TOKEN0, IERC20.abi, wallet);
        const token1Contract = new ethers.Contract(TOKEN1, IERC20.abi, wallet);

        const balance0 = await token0Contract.balanceOf(wallet.address);
        const balance1 = await token1Contract.balanceOf(wallet.address);

        console.log("Token0 balance after swap:", ethers.utils.formatEther(balance0));
        console.log("Token1 balance after swap:", ethers.utils.formatEther(balance1));
    } catch (error) {
        console.error("Swap failed:", error);
        if (error.error && error.error.message) {
            console.error("Error message:", error.error.message);
        }
        // 尝试获取 revert 原因
        if (error.receipt) {
            const provider = new ethers.providers.JsonRpcProvider(CONFIG.PROVIDER_URL);
            try {
                const tx = await provider.getTransaction(error.receipt.transactionHash);
                const code = await provider.call(tx, tx.blockNumber);
                console.error("Revert reason:", ethers.utils.toUtf8String(code));
            } catch (e) {
                console.error("Could not get revert reason:", e);
            }
        }
        throw error;
    }
}

async function main() {
    try {
        console.log("Starting swap process...");
        console.log("Token0 (input):", TOKEN0);
        console.log("Token1 (output):", TOKEN1);

        await performSwap();
        console.log("Swap process completed successfully!");
    } catch (error) {
        console.error("Error in main:", error);
        if (error.error) {
            console.error("Error details:", error.error);
        }
        if (error.receipt) {
            console.error("Transaction receipt:", error.receipt);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });