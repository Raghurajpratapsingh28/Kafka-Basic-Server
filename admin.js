const {kafka} = require('./client');
  
async function init(){
  const admin = kafka.admin();
  console.log("admin connecting....")
  try {
    await admin.connect();
    console.log("admin connection established....")
    await admin.createTopics({
      topics:[{
        topic:"rider-updates",
        numPartitions:2,
        replicationFactor:1
      }]
    })
    console.log("topics created....")
  } catch (err) {
    console.error("admin error:", err);
    process.exitCode = 1;
  } finally {
    try { await admin.disconnect();
        console.log("admin disconnected successfully...")
     } catch {}
  }
}

init();