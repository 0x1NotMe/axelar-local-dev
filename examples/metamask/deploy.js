const { createNetwork, getNetwork, relay, getGasCost, getFee } = require('../../dist/networkUtils.js');
const { setJSON, deployContract } = require('../../dist/utils.js');
const { utils : {defaultAbiCoder}, constants: {AddressZero}, BigNumber, Wallet } = require('ethers');

const ExecutableSample = require('../../build/ExecutableSample.json');
const ERC4626Vault = require('../../build/ERC4626Vault.json');
const SampleStrategy = require('../../build/SampleStrategy.json');

(async () => {

    console.log("getting chains");
    const chain1 = await getNetwork("http://localhost:8501");
    const chain2 = await getNetwork("http://localhost:8502");

    const user1 = new Wallet("0x7f47466019ec556ec0b36b3c9033b41b34a6b98f108b0ff60f89e012f7cd1873", chain1.provider);
    const user2 = new Wallet("0x7f47466019ec556ec0b36b3c9033b41b34a6b98f108b0ff60f89e012f7cd1873", chain2.provider);

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

    // // This is used for logging.
    // const print = async () => {
    //     console.log(`user1 has ${await chain1.ust.balanceOf(user1.address)} UST.`);
    //     console.log(`user2 has ${await chain2.ust.balanceOf(user2.address)} UST.`);
    //     console.log(`st1: ${await st1.value()}`);
    //     console.log(`st2: ${await st2.value()}`);
    //     console.log(`Vault has: ${await chain1.ust.balanceOf(vault.address)} UST.`);
    //     console.log(`Strategy has: ${await chain1.ust.balanceOf(st1.address)} UST.`);
    //     console.log(`user1 has ${await chain1.ust.balanceOf(user1.address)} UST.`);
    // }

    // console.log('--- Initially ---');
    // await print();

    // const gasLimit = 11473448;
    // const gasPrice = new BigNumber.from("20000000000");
    // const gasCost = getGasCost(chain1, chain2, AddressZero);

    // console.log(gasCost);

    // // Approve and deposit Vault
    // await(await chain1.ust.connect(user1).approve(vault.address, 100000000)).wait();
    // await(await vault.connect(user1).deposit(10000, vault.address, { gasLimit:gasLimit, gasPrice: gasPrice})).wait();

    // await print();
    // // Approve the AxelarGateway to use our UST on chain1.
    // await (await chain1.ust.connect(user1).approve(chain1.gateway.address, 5000000)).wait();
    // // And have it send it to chain2.
    // await (await chain1.gateway.connect(user1).sendToken(chain2.name, user2.address, 'UST', 5000000)).wait();
    // // This facilitates the send.
    // // await relay();
    // // After which the funds have reached chain2
    // console.log('--- After Sending Token ---');
    // await print();
    // // Set the value on chain1. This will also cause the value on chain2 to change after relay() is called.
    // await (await st1.connect(user1).set(chain2.name, 'Hello World!', {value: gasLimit * gasCost})).wait();
    // console.log('--- After Setting but Before Relay---');
    // await print();
    // // Updates the value on chain2 also.
    // // await relay();
    // console.log('--- After Setting and Relaying---');
    // await print();

})();