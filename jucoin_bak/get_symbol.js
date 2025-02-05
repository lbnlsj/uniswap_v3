// Import required ethers.js components
const {ethers} = require('ethers');

// WETH9 ABI - we only need the name() function
const WETH9_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)"
];

async function getChainInfo() {
    try {
        // Connect to the RPC endpoint
        const provider = new ethers.providers.JsonRpcProvider('http://47.128.241.199:8545');

        // Get the network information
        const network = await provider.getNetwork();
        console.log('Network Chain ID:', network.chainId);

        // Get native currency symbol
        const nativeCurrencySymbol = await getNativeCurrencySymbol(provider);
        console.log('Native Currency Symbol:', nativeCurrencySymbol);

        // Since we don't have a direct way to get WETH9 address,
        // we'll need to deploy it or get it from a known address
        // For now, we can check a common WETH deployment
        const possibleWethAddresses = [
            '0x35ef5af2D33096007f04AB77050687fd7461BEfa'
        ];

        for (const address of possibleWethAddresses) {
            try {
                const weth = new ethers.Contract(address, WETH9_ABI, provider);
                const name = await weth.name();
                const symbol = await weth.symbol();
                console.log(`Found WETH at ${address}`);
                console.log('Name:', name);
                console.log('Symbol:', symbol);
                break;
            } catch (error) {
                console.log(`No WETH found at ${address}`);
            }
        }

    } catch (error) {
        console.error('Error querying chain info:', error);
    }
}

async function getNativeCurrencySymbol(provider) {
    try {
        // First try to get it from the eth_chainId method
        const network = await provider.getNetwork();
        if (network.name && network.name !== 'unknown') {
            return network.name.toUpperCase();
        }

        // If that doesn't work, try to get it from a block
        const block = await provider.getBlock('latest');
        if (block && block.baseFeePerGas) {
            // If the chain has EIP-1559, it's likely ETH
            return 'ETH';
        }

        // Default fallback
        return 'UNKNOWN';
    } catch (error) {
        console.error('Error getting native currency:', error);
        return 'UNKNOWN';
    }
}

// Execute the query
getChainInfo();