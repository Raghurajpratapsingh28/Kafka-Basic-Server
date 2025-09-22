const {kafka} = require('./client');



async function init(){
    const producer = kafka.producer();
    console.log("connecting producer..........")
    await producer.connect();
    console.log("producer connected........")
     
    await producer.send({
        topic:"rider-updates",
        messages:[{value:JSON.stringify({
            riderId:1,
            riderName:"John Doe",
            riderLocation:"New York",
            riderStatus:"active"
        })}]    
    })
    console.log("message sent........")
    await producer.disconnect();
    console.log("producer disconnected........")
}

init();