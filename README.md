
## Notion Docs
[Apache Kafka – Notion](https://www.notion.so/Apache-Kafka-2763c74de3c280d2a1e0ec26efd12591?source=copy_link)

## KafkaJS Rider Updates Example

This project demonstrates a minimal end-to-end Kafka workflow using Node.js and KafkaJS:
- An admin client creates a topic with multiple partitions
- A producer writes keyed messages, routing to partitions based on content
- Multiple consumers in a consumer group share the workload

The example topic is `rider-updates` with 2 partitions. Messages include a rider name and a location ("north" or anything else), and are routed to partition 0 (north) or 1 (non-north).

## Prerequisites
- Docker Desktop
- Node.js 18+ and npm
- macOS, Linux, or Windows (WSL2 recommended on Windows)

## Quick Start
1) Start ZooKeeper (required for this Kafka image):
```bash
docker run -p 2181:2181 zookeeper
```

2) Start Kafka and expose port `9092` (replace `<PRIVATE_IP>` with your host IP):
```bash
docker run -p 9092:9092 \
-e KAFKA_ZOOKEEPER_CONNECT=<PRIVATE_IP>:2181 \
-e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://<PRIVATE_IP>:9092 \
-e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
confluentinc/cp-kafka
```

Tips for `<PRIVATE_IP>`:
- macOS: `ipconfig getifaddr en0` usually returns your LAN IP
- Docker Desktop on macOS/Windows: you can often use `host.docker.internal`
- If both containers run on the same Docker network, use the container name/IP instead

3) Install dependencies in this folder:
```bash
npm install
```

4) Create the topic:
```bash
node admin.js
```

5) Start one or more consumers (use the same group to share partitions):
```bash
node consumer.js rider-service
node consumer.js rider-service
```

6) Start the producer and send messages:
```bash
node producer.js
> tony south
> tony north
```

You should see messages delivered to different partitions and balanced across consumers in the same group.

## Project Structure
- `client.js`: Initializes and exports a KafkaJS client
- `admin.js`: Creates the `rider-updates` topic with 2 partitions
- `producer.js`: Interactive CLI producer routing by location → partition
- `consumer.js`: Consumer application (group ID from CLI argument)

## Code Snippets
`client.js`
```js
const { Kafka } = require("kafkajs");

exports.kafka = new Kafka({
  clientId: "my-app",
  brokers: ["<PRIVATE_IP>:9092"],
});
```

`admin.js`
```js
const { kafka } = require("./client");

async function init() {
  const admin = kafka.admin();
  console.log("Admin connecting...");
  admin.connect();
  console.log("Adming Connection Success...");

  console.log("Creating Topic [rider-updates]");
  await admin.createTopics({
    topics: [
      {
        topic: "rider-updates",
        numPartitions: 2,
      },
    ],
  });
  console.log("Topic Created Success [rider-updates]");

  console.log("Disconnecting Admin..");
  await admin.disconnect();
}

init();
```

`producer.js`
```js
const { kafka } = require("./client");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function init() {
  const producer = kafka.producer();

  console.log("Connecting Producer");
  await producer.connect();
  console.log("Producer Connected Successfully");

  rl.setPrompt("> ");
  rl.prompt();

  rl.on("line", async function (line) {
    const [riderName, location] = line.split(" ");
    await producer.send({
      topic: "rider-updates",
      messages: [
        {
          partition: location.toLowerCase() === "north" ? 0 : 1,
          key: "location-update",
          value: JSON.stringify({ name: riderName, location }),
        },
      ],
    });
  }).on("close", async () => {
    await producer.disconnect();
  });
}

init();
```

`consumer.js`
```js
const { kafka } = require("./client");
const group = process.argv[2];

async function init() {
  const consumer = kafka.consumer({ groupId: group });
  await consumer.connect();

  await consumer.subscribe({ topics: ["rider-updates"], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
      console.log(
        `${group}: [${topic}]: PART:${partition}:`,
        message.value.toString()
      );
    },
  });
}

init();
```

## How It Works
- **Partitions**: The topic has 2 partitions. The producer maps location → partition:
  - `north` → partition 0
  - everything else → partition 1
- **Consumer groups**: Multiple consumers with the same `groupId` split partitions among themselves for horizontal scaling.
- **Ordering**: Within a partition, relative order is preserved. Across partitions, ordering is independent.

## Troubleshooting
- **Producer/consumer cannot connect**: Verify `KAFKA_ADVERTISED_LISTENERS` uses an IP/hostname reachable from your host. Try `host.docker.internal:9092` on Docker Desktop.
- **Topic not found**: Ensure `admin.js` ran successfully and Kafka logs show the broker is ready.
- **Stuck offsets / re-processing**: Toggle `fromBeginning: true/false` in the consumer subscribe options, or change the consumer group ID.
- **ZooKeeper deprecation**: Newer Kafka versions support KRaft (no ZooKeeper). This example uses the Confluent image with ZooKeeper for simplicity.

## Cleaning Up
Stop and remove the Kafka and ZooKeeper containers once finished.

## Notes
- For production, set replication factors > 1 and run a multi-broker cluster.
- Consider keys for partitioning (e.g., rider ID) instead of manual partition selection for better distribution and ordering guarantees per key.