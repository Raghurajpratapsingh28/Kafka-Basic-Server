const {kafka} = require("./client");

async function init(){
    const consumer =  kafka.consumer({groupId:"user-updates"});
     await consumer.connect();
     await consumer.subscribe({topic:"rider-updates",fromBeginning:true});
     await consumer.run({
        eachMessage:async ({topic,partition,message})=>{
            console.log(`
               Topic: ${topic}
               Partition: ${partition}
               Message:   `);
        }
     })

       
}

init();
