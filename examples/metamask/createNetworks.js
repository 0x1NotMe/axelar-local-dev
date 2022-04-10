const { createNetwork, relay, getGasCost, getFee } = require('../../dist/networkUtils.js');
const { setJSON, deployContract } = require('../../dist/utils.js');
const { utils : {defaultAbiCoder}, constants: {AddressZero}, BigNumber } = require('ethers');

const ExecutableSample = require('../../build/ExecutableSample.json');
const ERC4626Vault = require('../../build/ERC4626Vault.json');
const SampleStrategy = require('../../build/SampleStrategy.json');


(async () => {
    // Create an Axelar network and serve it at port 8501
    const chain1 = await createNetwork({
        port: 8501,
        seed: '1',
    });

    const chain2 = await createNetwork({
        port: 8502,
        seed: '2',
    });

    setJSON(chain1.getInfo(), './chain1.json');
    setJSON(chain2.getInfo(), './chain2.json');

    let lock = false
    setInterval(async () => {
        if (lock) return;
        lock = true;
        await relay();
        lock = false;
    }, 1000);

    const args = process.argv.slice(2);
    if (args && args.length === 0) return;
    const address = args[0];
    console.log(`Giving 1 ETH and 1000 UST to ${address} on both Chains...`);
    const [user1] = chain1.userWallets;
    await (await user1.sendTransaction({
        to: address,
        value: BigInt(1e18),
    })).wait();
    await chain1.giveToken(address, 'UST', 1e9);
    const [user2] = chain2.userWallets;
    await (await user2.sendTransaction({
        to: address,
        value: BigInt(1e18),
    })).wait();
    await chain2.giveToken(address, 'UST', 1e9);
    console.log('Done!');

    console.log("deploying vault");
    const vault = await deployContract(user1, ERC4626Vault, [chain1.ust.address]);
    console.log("vault deployed, now strats");

    const st1 = await deployContract(user1, SampleStrategy, [vault.address, chain1.ust.address, chain1.gateway.address, chain1.gasReceiver.address]);
    const st2 = await deployContract(user2, SampleStrategy, [AddressZero, chain2.ust.address, chain2.gateway.address, chain2.gasReceiver.address]);
    
    console.log("strats deployed" );
    console.log("st1 :" + st1.address);
    console.log("st2 :" + st2.address);
    // Inform our exeuctables about each other.
    await (await st1.connect(user1).addSibling(chain2.name, st2.address)).wait();
    await (await st2.connect(user2).addSibling(chain1.name, st1.address)).wait();
    console.log("strats set up done");

    // attach sample Strategy to vault
    await vault.connect(user1).updateStrategy(st1.address);
    console.log("vault attached to strat");

    const deployInfo = {
        vault: vault.address,
        strat1: st1.address,
        strat2: st2.address
    }

    setJSON(deployInfo, './deployInfo.json');
    console.log("deploy successful");
    
})();

export async function test() {
    console.log("test succeeded");
}