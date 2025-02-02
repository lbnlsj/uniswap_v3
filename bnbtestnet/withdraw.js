const { ethers } = require("ethers");

// Import necessary ABIs - we'll define a minimal version for our needs
const POSITION_MANAGER_ABI = [
    // Read position information
    "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
    // Decrease liquidity in a position
    "function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline) params) external payable returns (uint256 amount0, uint256 amount1)",
    // Collect fees and tokens
    "function collect(tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max) params) external payable returns (uint256 amount0, uint256 amount1)"
];

// Configuration object
const CONFIG = {
    PROVIDER_URL: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    PRIVATE_KEY: "0x0ed0c32803ecf126ba91b65a0a83235bd5e2a6aee5d17ca6676c6780b8328dff",
    POSITION_MANAGER: "0xaf8ABfa64d433C7E9cA45A56Ba4753b43ac0514B",
    TOKEN_ID: 1,
};

// Calculate MAX_UINT128 = 2^128 - 1
const MAX_UINT128 = ethers.BigNumber.from(2).pow(128).sub(1);

class UniswapV3LiquidityManager {
    constructor(config) {
        this.provider = new ethers.providers.JsonRpcProvider(config.PROVIDER_URL);
        this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);
        this.positionManager = new ethers.Contract(
            config.POSITION_MANAGER,
            POSITION_MANAGER_ABI,
            this.wallet
        );
    }

    async getPositionInfo(tokenId) {
        console.log(`Fetching position info for token ID ${tokenId}...`);
        try {
            const position = await this.positionManager.positions(tokenId);

            const positionInfo = {
                nonce: position.nonce,
                operator: position.operator,
                token0: position.token0,
                token1: position.token1,
                fee: position.fee,
                tickLower: position.tickLower,
                tickUpper: position.tickUpper,
                liquidity: position.liquidity,
                feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
                feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
                tokensOwed0: position.tokensOwed0,
                tokensOwed1: position.tokensOwed1
            };

            console.log("Position info:", {
                ...positionInfo,
                liquidity: positionInfo.liquidity.toString(),
                tokensOwed0: positionInfo.tokensOwed0.toString(),
                tokensOwed1: positionInfo.tokensOwed1.toString()
            });

            return positionInfo;
        } catch (error) {
            console.error("Error fetching position info:", error);
            throw error;
        }
    }

    async removeLiquidity(tokenId, percentageToRemove) {
        console.log(`Preparing to remove ${percentageToRemove}% liquidity from position ${tokenId}`);

        // Get current position details
        const position = await this.getPositionInfo(tokenId);

        // Calculate the amount of liquidity to remove
        const liquidityToRemove = position.liquidity.mul(ethers.BigNumber.from(percentageToRemove)).div(100);

        console.log("Liquidity to remove:", liquidityToRemove.toString());

        const params = {
            tokenId: tokenId,
            liquidity: liquidityToRemove,
            amount0Min: 0,  // Set to 0 for this example - in production, calculate minimum amounts
            amount1Min: 0,  // Set to 0 for this example - in production, calculate minimum amounts
            deadline: Math.floor(Date.now() / 1000) + 1800 // 30 minutes from now
        };

        console.log("Decreasing liquidity with params:", {
            ...params,
            liquidity: params.liquidity.toString()
        });

        try {
            if (!liquidityToRemove.isZero()) {
                // Decrease the liquidity only if there is liquidity to remove
                const tx = await this.positionManager.decreaseLiquidity(params, {
                    gasLimit: ethers.utils.hexlify(1000000)
                });

                const receipt = await tx.wait();
                console.log("Liquidity removal transaction completed:", receipt.transactionHash);
            } else {
                console.log("No liquidity to remove");
            }

            // Now collect the tokens
            return await this.collectTokens(tokenId);
        } catch (error) {
            console.error("Error removing liquidity:", error);
            throw error;
        }
    }

    async collectTokens(tokenId) {
        console.log(`Collecting tokens for position ${tokenId}`);

        const params = {
            tokenId: tokenId,
            recipient: this.wallet.address,
            amount0Max: MAX_UINT128, // Using our calculated MAX_UINT128
            amount1Max: MAX_UINT128  // Using our calculated MAX_UINT128
        };

        try {
            const tx = await this.positionManager.collect(params, {
                gasLimit: ethers.utils.hexlify(500000)
            });

            const receipt = await tx.wait();
            console.log("Token collection transaction completed:", receipt.transactionHash);

            return receipt;
        } catch (error) {
            console.error("Error collecting tokens:", error);
            throw error;
        }
    }
}

async function main() {
    try {
        console.log("Starting liquidity withdrawal process...");

        const liquidityManager = new UniswapV3LiquidityManager(CONFIG);

        // First, get the position information
        const positionInfo = await liquidityManager.getPositionInfo(CONFIG.TOKEN_ID);

        // Remove all liquidity (100%)
        const withdrawalResult = await liquidityManager.removeLiquidity(CONFIG.TOKEN_ID, 100);

        console.log("Liquidity withdrawal completed successfully!");
        console.log("Transaction receipt:", withdrawalResult);

    } catch (error) {
        console.error("Error in main:", error);
        if (error.error) {
            console.error("Error details:", error.error);
        }
        process.exit(1);
    }
}

// Execute the script
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = {
    UniswapV3LiquidityManager,
    CONFIG
};