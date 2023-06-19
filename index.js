const express = require('express');
const axios = require('axios')
const app = express();
const { ethers } = require('ethers');
const bedrockFactoryABI = require("./abi/bedrockFactory.json")
const bedrockPairABI = require("./abi/bedrockPair.json")
const erc20ABI = require("./abi/erc20.json")
let bedrockFactoryContractAddress = "0x570CE8bfaF5eF9403FE04D51076cA57C2878EBE8";

const providerUrl = 'https://bsc-dataseed.binance.org/';
const provider = new ethers.providers.JsonRpcProvider(providerUrl);

async function getTokenSymbol(tokenAddress) {
  const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
  return await tokenContract.name();
}
async function getTokenDecimals(tokenAddress) {
  const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
  return await tokenContract.decimals();
}

async function getPrice(address){
  const api_url = `https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${address}&vs_currencies=usd`;
  const response = await axios.get(api_url);
  const data = response.data;
  const tokenAddress = Object.keys(data)[0];
  const priceData = data[tokenAddress].usd;
  return priceData
}



app.get('/tickers', async (req, res) => {


    try {

      const factoryContract = new ethers.Contract(bedrockFactoryContractAddress, bedrockFactoryABI, provider);
      const pairCount = await factoryContract.allPairsLength();

      const tickersData = [];

      for (let i = 0; i < pairCount; i++) {
        const pairAddress = await factoryContract.allPairs(i);
        const lpTokenContract = new ethers.Contract(pairAddress, bedrockPairABI, provider);
        const token0 = await lpTokenContract.token0();
        const token1 = await lpTokenContract.token1();
        const reserves = await lpTokenContract.getReserves();
        const token0Symbol = await getTokenSymbol(token0);
        const token1Symbol = await getTokenSymbol(token1);
        const token0Decimals = await getTokenDecimals(token0);
        const token1Decimals = await getTokenDecimals(token1);
        const token0Price = await getPrice(token0)
        const token1Price = await getPrice(token1)
        const bid = (parseFloat(token0Price) * 0.98).toFixed(2);
        const ask = (parseFloat(token0Price) * 1.02).toFixed(2);
        const high = (parseFloat(token0Price) * 1.026).toFixed(2);
        const low = (parseFloat(token0Price) * 0.974).toFixed(2);


        const tickerData = {
          ticker_id: `${token0}_${token1}`,
          base_currency: token0,
          target_currency: token1,
          last_price: token0Price,
          pool_id:pairAddress,
          liquidity_in_usd: (token0Price * Number(reserves[0]/ 10 ** token0Decimals)) + (token1Price * Number(reserves[1]/ 10 ** token1Decimals)),
          bid: bid,
          ask: ask,
          high: high,
          low: low,
        };

        tickersData.push(tickerData);
      }


      res.json(tickersData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
});

  // Start the server
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });