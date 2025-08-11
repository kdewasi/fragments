# Lab 10

In this lab we will explore how to use [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) and the [DynamoDB AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/index.html). We will also continue to practice working with `docker compose`, authoring compose files, using Hurl to write more integration tests, and learn how to run integration tests in our Continuous Integration workflow.

When you are done, you will have added [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) support to your `fragments` microservice, and also created local, testing, and CI environments to validate it.

## AWS DynamoDB Overview

[Amazon DynamoDB](https://aws.amazon.com/dynamodb/) is a fully managed [NoSQL database](https://en.wikipedia.org/wiki/NoSQL). It was launched in 2012, but really took off when [serverless computing](https://en.wikipedia.org/wiki/Serverless_computing) became popular in 2015 (DynamoDB's architecture is ideal for serverless access). You can store nearly limitless amounts of data without worrying about scaling, performance, or client connection issues: DynamoDB tables have consistent performance at any scale.

Unlike SQL or document-based, NoSQL databases like [MongoDB](https://www.mongodb.com/document-databases), [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) is a **key/value** datastore. Every **item** in a DynamoDB **table** must include a **primary key**, which is called a **partition key**. The **partition key** uniquely identifies the **item**. The **partition key** can be a **simple key**, for example a `username` or `customer_id`, or a **composite key** made-up of two values, for example a `company` name and `username`. When data uses a **composite key**, we call the first key the **partition key** and the second key the **sort key**. Queries are done based on these only. As a result, it's important to understand how you will **access** and **query** your data before you design your table.

A DynamoDB **item** is a record in a **table** (like a row of data), and is limited to **400kb** in size (i.e., you don't store big data in DynamoDB). These **items** are made up of **attributes** (like a column in a row), which are _typed_ values (e.g., `fname` as `String`, `price` as `Number`). An item's attributes don't need to be defined up-front, and not all items in a table have to have the same attributes: DynamoDB is **schemaless**. Rather than enforcing the data's schema in the database, it's up to the application to enforce it; DynamoDB will let you store whatever you want for a given key.

[Amazon DynamoDB](https://aws.amazon.com/dynamodb/) is billed on-demand: instead of worrying about the cost to run database servers, you only pay for your reads (per second), writes (per second), and for the amount of data you store (per GB).

## Modelling Fragments Metadata in DynamoDB

In our previous lab, we explored how to use [AWS S3](https://aws.amazon.com/s3/) to store our `fragment` data. We learned that [AWS S3](https://aws.amazon.com/s3/) is ideally suited to storing large, arbitrarily _sized_ and _typed_ data. Our `fragments` data is between 0 and 5Mb in size, and can be any type from text to JSON to binary images. With [AWS S3](https://aws.amazon.com/s3/) we were able to store our data in a collection called a **bucket** using a unique **key**, which took the form: `ownerId/id`. For example, we might store the data for a Markdown `fragment` at: `s3://fragments/48231381ba2850a496357d947d0acdca6d6ac2fca3311f6bb8acf44dd00e7b5b/3bb28532-b5ec-44d5-b0df-7bd824312da5`

Now we need to store our `fragment` **metadata**. We could store this along with the data in [AWS S3](https://aws.amazon.com/s3/) using [object metadata](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html); but a better option is to store it separately in [Amazon DynamoDB](https://aws.amazon.com/dynamodb/). In our design, a `fragment` will be split across [AWS S3](https://aws.amazon.com/s3/) (data) and [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) (metadata).

In order to accomplish our design, we'll create a DynamoDB Table named `fragments`, which will use a two-part **composite key**:

1. a `fragment` has an **owner** (i.e,. `ownerId`)
2. a `fragment` has an **id**

Each `fragment` will be an **item** in our table. Since an **owner** might have many fragments (i.e., **ids**), we'll use the `ownerId` as our **partition key**, and the fragment `id` as our **sort key**. The other `fragment` values `created`, `updated`, `type`, `size` will be **attributes** on each `fragment` **item**.

### 1. Create a DynamoDB Table

Before you can work with [Amazon DynamoDB](https://aws.amazon.com/dynamodb/), you need to create a **table**. There are various ways to accomplish this, and we'll use the **AWS Console**.

1. Start the **AWS Academy Learner Lab** environment, and open the **AWS Console**
2. Search for **DynamoDB** in the list of services
3. Click **Create table**
4. Enter a **Table name** of `fragments`
5. Enter a **Partition key** of `ownerId`, which is of type `String`
6. Enter a **Sort key** of `id`, which is also of type `String`
7. The rest of the **Settings** can remain at the **Default settings**
8. Click **Create table**

### 2. Manually Create an Item

Before we programmatically work with our table, we'll try working with it manually in the console.

1. Click on the **table** you just created in step 1
2. Under the **Actions** menu, click **Create item**
3. Enter an `ownerId` of `48231381ba2850a496357d947d0acdca6d6ac2fca3311f6bb8acf44dd00e7b5b`
4. Enter an `id` of `3bb28532-b5ec-44d5-b0df-7bd824312da5`
5. Under the **Add new attribute** button, choose **String**. Enter the name `created` and the value `2021-11-08T01:04:46.071Z`. In DynamoDB, dates are stored as `String` or `Number` (there is no `Date` type)
6. Do the same process for the `updated` attribute, using a value of `2021-11-08T01:04:46.073Z`
7. Add a `size` attribute of type **Number** and with a value of `18`
8. Add a `type` attribute of type **String** and with a value of `text/plain`
9. When you have added all the **attributes**, click the **Create item** button

You can now view your table's items using the **Explore table items** button. Clicking it will **scan** your table and display your items. Click on the `48231381b...` key under `ownerId` to see your item. At the top-right, click the **JSON** button to see the item in **DynamoDB JSON** format, which includes type information for each attribute (e.g., `S` for `String`, `N` for `Number`):

```json
{
  "ownerId": {
    "S": "48231381ba2850a496357d947d0acdca6d6ac2fca3311f6bb8acf44dd00e7b5b"
  },
  "id": {
    "S": "3bb28532-b5ec-44d5-b0df-7bd824312da5"
  },
  "created": {
    "S": "2021-11-08T01:04:46.071Z"
  },
  "updated": {
    "S": "2021-11-08T01:04:46.071Z"
  },
  "size": {
    "N": "18"
  },
  "type": {
    "S": "text/plain"
  }
}
```

Go back to your **Items** view and click the checkbox next to your item. Click **Delete items** under the **Actions** drop-down, and click **Delete** when prompted for confirmation.

### 3. Using the AWS DynamoDB CLI

Next, let's try using the [AWS dynamodb CLI](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dynamodb/create-table.html). Go back to the AWS Learner Lab web page.

1. In the **AWS Terminal**, at the prompt, enter the following command (NOTE: your prompt will look slightly different):

```sh
ddd_v1_w_ysZ_1002077@runweb52176:~$ aws dynamodb list-tables
```

2. You should see a list of your **Tables**, including the table you created in step 1.
3. Get a description of your `fragments` table with the following command:

```sh
ddd_v1_w_ysZ_1002077@runweb52179:~$ aws dynamodb describe-table --table-name fragments
{
    "Table": {
        "AttributeDefinitions": [
            {
                "AttributeName": "id",
                "AttributeType": "S"
            },
            {
                "AttributeName": "ownerId",
                "AttributeType": "S"
            }
        ],
        "TableName": "fragments",
        "KeySchema": [
            {
                "AttributeName": "ownerId",
                "KeyType": "HASH"
            },
            {
                "AttributeName": "id",
                "KeyType": "RANGE"
            }
        ],
        "TableStatus": "ACTIVE",
        "CreationDateTime": "2022-04-03T10:41:09.117000-07:00",
        "ProvisionedThroughput": {
            "LastDecreaseDateTime": "2022-04-03T10:53:57.642000-07:00",
            "NumberOfDecreasesToday": 2,
            "ReadCapacityUnits": 1,
            "WriteCapacityUnits": 1
        },
        "TableSizeBytes": 0,
        "ItemCount": 0,
        "TableArn": "arn:aws:dynamodb:us-east-1:423201066495:table/fragments",
        "TableId": "f0a7b457-1432-4394-a736-3e6914e71021"
    }
}
```

4. Notice the definition of your table, with **name** and **type** for your attributes, as well as the definition of your **key**, which uses `ownerId` as the `HASH` key (i.e., **partition key**) and `id` as the `RANGE` key (i.e., **sort key**).

### 4. Using the DynamoDB SDK with fragments

Now that we have the basic idea, let's move toward using the [DynamoDB AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/index.html), which is how we'll primarily work with [Amazon DynamoDB](https://aws.amazon.com/dynamodb/). All of the clients (console, cli, SDK) work the same way: they create HTTP requests and send commands to DynamoDB. The [DynamoDB AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/index.html) helps us do this with JavaScript or TypeScript.

5. Start by installing `V3` of the [DynamoDB AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/index.html) (NOTE: there is also an [older version](https://www.npmjs.com/package/aws-sdk) that we will **not** use, and which you'll see used in various places on the web). We'll also include the helper library [@aws-sdk/lib-dynamodb](https://www.npmjs.com/package/@aws-sdk/lib-dynamodb), to simplify working with DynamoDB attribute types in JavaScript. Install both modules in your `fragments` server:

```sh
cd fragments
npm install --save @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

6. In our previous lab, we created a new AWS data model in `src/model/data/aws/`, which included an `s3Client.js`. This file configured the [S3 SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/index.html), so that we could issue **commands**. We also wrote this code in such a way that we can easily swap the implementation of S3 that we use at runtime (e.g., use [LocalStack](https://localstack.cloud/) for testing) via an `endpoint` URL. In this lab we will do a very similar process in order to add [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) support to our `fragments` service. Fist we'll define a **DynamoDB Document Client** named `ddbDocClient.js` and configure it. Then, we'll use it to run **DynamoDB Commands** against our `fragments` DynamoDB table.

Begin by creating a new file, `src/model/data/aws/ddbDocClient.js`:

```js
// src/model/data/aws/ddbDocClient.js

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
// Helper library for working with converting DynamoDB types to/from JS
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const logger = require('../../../logger');

/**
 * If AWS credentials are configured in the environment, use them. Normally when we connect to DynamoDB from a deployment in AWS, we won't bother with this.  But if you're testing locally, you'll need
 * these, or if you're connecting to LocalStack or DynamoDB Local
 * @returns Object | undefined
 */
const getCredentials = () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    // See https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/dynamodbclientconfig.html#credentials
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      // Optionally include the AWS Session Token, too (e.g., if you're connecting to AWS from your laptop).
      // Not all situations require this, so we won't check for it above, just use it if it is present.
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
    logger.debug('Using extra DynamoDB Credentials');
    return credentials;
  }
};

/**
 * If an AWS DynamoDB Endpoint is configured in the environment, use it.
 * @returns string | undefined
 */
const getDynamoDBEndpoint = () => {
  if (process.env.AWS_DYNAMODB_ENDPOINT_URL) {
    logger.debug(
      { endpoint: process.env.AWS_DYNAMODB_ENDPOINT_URL },
      'Using alternate DynamoDB endpoint'
    );
    return process.env.AWS_DYNAMODB_ENDPOINT_URL;
  }
};

// Create and configure an Amazon DynamoDB client object.
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: getDynamoDBEndpoint(),
  credentials: getCredentials(),
});

// Instead of exposing the ddbClient directly, we'll wrap it with a helper
// that will simplify converting data to/from DynamoDB and JavaScript (i.e.
// marshalling and unmarshalling typed attribute data)
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: false, // false, by default.
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: false, // false, by default.
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: true, // we have to set this to `true` for LocalStack
  },
  unmarshallOptions: {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, // false, by default.
  },
});

module.exports = ddbDocClient;
```

7. Modify `src/model/data/aws/index.js` to get rid of all uses of `MemoryDB`, since we won't be storying any data in memory, and will use DynamoDB instead. Add a `require()` to use your `ddbDocClient.js` module instead:

```js
const s3Client = require('./s3Client');
const ddbDocClient = require('./ddbDocClient');
```

8. In `src/model/data/aws/index.js`, modify the `writeFragment` function to use our `ddbDocClient` and the [`PutCommand` from the SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/classes/_aws_sdk_lib_dynamodb.putcommand-2.html). A DynamoDB `PUT` command converts a JavaScript `Object` into a DynamoDB **item** with typed **attributes** and **key** values, and adds/updates a DynamoDB table. NOTE: you can differentiate between `add` and `update` via the [`UpdateCommand` from the SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/classes/_aws_sdk_lib_dynamodb.updatecommand-2.html), but we'll prefer to always use `PutCommand` for simplicity.

```js
const ddbDocClient = require('./ddbDocClient');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');

...

// Writes a fragment to DynamoDB. Returns a Promise.
function writeFragment(fragment) {
  // Configure our PUT params, with the name of the table and item (attributes and keys)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Item: fragment,
  };

  // Create a PUT command to send to DynamoDB
  const command = new PutCommand(params);

  try {
    return ddbDocClient.send(command);
  } catch (err) {
    logger.warn({ err, params, fragment }, 'error writing fragment to DynamoDB');
    throw err;
  }
}
```

9. Next, modify the `readFragment` function to use our `ddbDocClient` and the [`GetCommand` from the SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/classes/_aws_sdk_lib_dynamodb.getcommand-2.html). A DynamoDB `GET` command uses a **Key** to get a DynamoDB **item** and converts it to a JavaScript `Object`.

```js
const { PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

...

// Reads a fragment from DynamoDB. Returns a Promise<fragment|undefined>
async function readFragment(ownerId, id) {
  // Configure our GET params, with the name of the table and key (partition key + sort key)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Key: { ownerId, id },
  };

  // Create a GET command to send to DynamoDB
  const command = new GetCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);
    // We may or may not get back any data (e.g., no item found for the given key).
    // If we get back an item (fragment), we'll return it.  Otherwise we'll return `undefined`.
    return data?.Item;
  } catch (err) {
    logger.warn({ err, params }, 'error reading fragment from DynamoDB');
    throw err;
  }
}
```

10. Next, modify the `listFragments` function to use our `ddbDocClient` and the [`QueryCommand` from the SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/classes/_aws_sdk_lib_dynamodb.querycommand-2.html). A DynamoDB `QUERY` command uses a **Key Condition Expression** to get all DynamoDB **items** that match some criteria, and returns them converted to JavaScript `Object`s. Our **Key Condition Expression** will look for all **items** with a given **partition key** (i.e., a given `ownerId`), allowing us to get all `fragments` for a user. We can also use a **Projection Expression** to limit which **attributes** we want to be included in the returned results--normally all of the **attributes** are returned.

```js
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

...

// Get a list of fragments, either ids-only, or full Objects, for the given user.
// Returns a Promise<Array<Fragment>|Array<string>|undefined>
async function listFragments(ownerId, expand = false) {
  // Configure our QUERY params, with the name of the table and the query expression
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    // Specify that we want to get all items where the ownerId is equal to the
    // `:ownerId` that we'll define below in the ExpressionAttributeValues.
    KeyConditionExpression: 'ownerId = :ownerId',
    // Use the `ownerId` value to do the query
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  // Limit to only `id` if we aren't supposed to expand. Without doing this
  // we'll get back every attribute.  The projection expression defines a list
  // of attributes to return, see:
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
  if (!expand) {
    params.ProjectionExpression = 'id';
  }

  // Create a QUERY command to send to DynamoDB
  const command = new QueryCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);

    // If we haven't expanded to include all attributes, remap this array from
    // [ {"id":"b9e7a264-630f-436d-a785-27f30233faea"}, {"id":"dad25b07-8cd6-498b-9aaf-46d358ea97fe"} ,... ] to
    // [ "b9e7a264-630f-436d-a785-27f30233faea", "dad25b07-8cd6-498b-9aaf-46d358ea97fe", ... ]
    return !expand ? data?.Items.map((item) => item.id) : data?.Items
  } catch (err) {
    logger.error({ err, params }, 'error getting all fragments for user from DynamoDB');
    throw err;
  }
}
```

11. Now it's your turn. Follow the same pattern we've used above in order to update the `deleteFragment` function. Currently, it deletes the fragment's metadata from the `MemoryDB` and data from S3. Change it so that the **metadata** gets deleted from S3 **and** DynamoDB.

### 5. Write an Integration Test

At this point you have modified your `fragments` server to use [Amazon DynamoDB](https://aws.amazon.com/dynamodb/), but does it work? It's hard to know until we write a test! We could rely on our unit tests, but they won't tell us if our new code works in combination with [Amazon DynamoDB](https://aws.amazon.com/dynamodb/).

Using what you learned in the previous labs, write a new **integration test** named `tests/integration/lab-10-dynamodb.hurl`. This test will make sure that the following steps all work together (i.e., do each of these steps and checks one after the other in the same `.hurl` file):

1. `POST` a new JSON `fragment` to `http://localhost:8080` as an authorized user. The fragment's body should be the JSON value, `{ "service": "DynamoDB" }`.
2. Confirm that the server returns a `201`, and **capture** the **Location** header value and the fragment's `id` in **variables** named `fragment1_url` and `fragment1_id`.
3. `GET` the `fragment` **info** (i.e., metadata) for the fragment you just created using the `Location` URL`/info` as an authorized user and confirm that the server returns a `200` and that all of the metadata properties match what you expect.
4. `POST` a second Markdown `fragment` to `http://localhost:8080` as the same authorized user. The fragment's body should be the Markdown value, `DynamoDB is **great**.`.
5. Confirm that the server returns a `201`, and once again **capture** the **Location** header value and the second `id` in **variables** named `fragment2_url` and `fragment2_id`.
6. `GET` the `fragment` **info** (i.e., metadata) you just created using the `url/info` as an authorized user and confirm that the server returns a `200` and that all of the metadata properties match what you expect.
7. `GET` all of the `fragments` for the same authorized user without expanding them (i.e., just get back the IDs) and confirm that the list of `fragments` **includes** the two `id` values you captured above
8. `DELETE` the **first** `fragment` you created above
9. Confirm that the server returns a `200`
10. Try to `GET` the **first** `fragment` again using the `url` you captured above as the authorized user.
11. Confirm that the server returns a `404`, since the fragment should be deleted.
12. `GET` all of the `fragments` for the same authorized user without expanding them (i.e., just get back the IDs) a second time, and confirm that the first `id` is **NOT** included but that the second `id` is (i.e., that the second was not deleted).

In order to run this test, we need to run our server so it has access to both [AWS S3](https://aws.amazon.com/s3/) and [Amazon DynamoDB](https://aws.amazon.com/dynamodb/). We could try to get this code working against AWS, but doing so would require you to `push`, `tag`, and `deploy` your code to Elastic Container Service over and over again until you get all bugs worked out. The process would not be fun!

A better way is to use local servers to simulate AWS.

### 6. Using LocalStack and DynamoDB Local Development

In our previous lab, we created `docker-compose.yml` and set up [LocalStack](https://localstack.cloud/) and [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) services to run local versions of AWS services. We also created a script, `scripts/local-aws-setup.sh` to set up our AWS resources (e.g., create an S3 bucket and DynamoDB table).

We'll use these now to test and debug our integration test and DynamoDB code.

> [!NOTE]
> Confirm that your `docker-compose.yml` from [lab 8](../lab-08/README.md) includes **environment** variables for your `fragments` service to access your local DynamoDB container, specifically: `AWS_DYNAMODB_ENDPOINT_URL=http://dynamodb-local:8000`, and `AWS_DYNAMODB_TABLE_NAME=${AWS_DYNAMODB_TABLE_NAME:-fragments}`. Read through the rest of the file to confirm that everything else is set up correctly. Here's an example of what it might look like:

```yaml
services:
  fragments:
    init: true
    build: .
    environment:
      - API_URL=http://localhost:8080
      - HTPASSWD_FILE=tests/.htpasswd
      - LOG_LEVEL=${LOG_LEVEL:-debug}
      # NOTE: we use Docker's internal network to the localstack container
      - AWS_S3_ENDPOINT_URL=http://localstack:4566
      # Use the DynamoDB local endpoint vs. AWS for DynamoDB AWS SDK clients.
      - AWS_DYNAMODB_ENDPOINT_URL=http://dynamodb-local:8000
      # This S3 bucket and DynamoDB table need to get created first, see
      # local-aws-setup.sh. We'll default to 'fragments' as the name, unless
      # something else is defined in the env.
      - AWS_S3_BUCKET_NAME=${AWS_S3_BUCKET_NAME:-fragments}
      - AWS_DYNAMODB_TABLE_NAME=${AWS_DYNAMODB_TABLE_NAME:-fragments}
    ports:
      - '8080:8080'

  # DynamoDB Local, see: https://hub.docker.com/r/amazon/dynamodb-local
  dynamodb-local:
    image: amazon/dynamodb-local
    ports:
      - '8000:8000'
    command: ['-jar', 'DynamoDBLocal.jar', '-inMemory']

  localstack:
    image: localstack/localstack
    ports:
      - '4566:4566'
    environment:
      - SERVICES=s3
      - DEFAULT_REGION=us-east-1
```

1. Start the Docker containers for your offline setup, and have `docker compose` re-build your `fragments` image (i.e., use the `--build` flag):

```sh
cd fragments
docker compose up --build -d
```

2. In a Unix shell, run the `scripts/local-aws-setup.sh` script to create your `fragments` bucket and table (NOTE: you will need to do this **every** time you (re)start the containers, since they don't store any data to disk):

```sh
$ ./scripts/local-aws-setup.sh
Setting AWS environment variables for LocalStack
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_SESSION_TOKEN=test
AWS_DEFAULT_REGION=us-east-1
Waiting for LocalStack S3...
LocalStack S3 Ready
Creating LocalStack S3 bucket: fragments
{
    "Location": "/fragments"
}
Creating DynamoDB-Local DynamoDB table: fragments
{
    "TableDescription": {
        "AttributeDefinitions": [
            {
                "AttributeName": "ownerId",
                "AttributeType": "S"
            },
            {
                "AttributeName": "id",
                "AttributeType": "S"
            }
        ],
        "TableName": "fragments",
        "KeySchema": [
            {
                "AttributeName": "ownerId",
                "KeyType": "HASH"
            },
            {
                "AttributeName": "id",
                "KeyType": "RANGE"
            }
        ],
        "TableStatus": "ACTIVE",
        "CreationDateTime": "2022-03-27T18:15:52.966000-04:00",
        "ProvisionedThroughput": {
            "LastIncreaseDateTime": "1969-12-31T19:00:00-05:00",
            "LastDecreaseDateTime": "1969-12-31T19:00:00-05:00",
            "NumberOfDecreasesToday": 0,
            "ReadCapacityUnits": 10,
            "WriteCapacityUnits": 5
        },
        "TableSizeBytes": 0,
        "ItemCount": 0,
        "TableArn": "arn:aws:dynamodb:ddblocal:000000000000:table/fragments"
    }
}
```

3. In another terminal, start streaming the logs from your `fragments` server, so you can see what's happening when the tests run. Use `docker ps` to find your `fragments` service, and get its `CONTAINER ID`, which will look something like `26bf87fafef5`. Use that `CONTAINER ID` to get logs for the container:

```sh
docker ps
docker logs -f 26bf87fafef5
```

> [!TIP]
> You could skip the `docker ps` part by giving your container a name in the `docker-compose.yml` file, see the [docs for `container_name`](https://docs.docker.com/compose/compose-file/compose-file-v3/#container_name).

4. In another terminal, run your integration test with `hurl`:

```sh
$ cd fragments
$ hurl --test tests/integration/lab-10-dynamodb.hurl
tests/integration/lab-10-dynamodb.hurl: RUNNING [1/1]
tests/integration/lab-10-dynamodb.hurl: SUCCESS
--------------------------------------------------------------------------------
Executed:  1
Succeeded: 1 (100.0%)
Failed:    0 (0.0%)
Duration:  100ms
```

If your test doesn't pass, look at the line that is failing and figure out which part of the test is not working. Use that to debug your server. You should inspect your logs for any clues as well.

Whenever you make changes to your server code, you'll need to rebuild and restart your `fragments` container. However, we don't need/want to restart the other containers, which are running fine. You can do that using the `--no-deps` option, and passing the `fragments` service name in order to rebuild/restart without touching the other containers:

```sh
docker compose up --build --no-deps -d fragments
```

5. When you have your test passing, stop your containers using the following:

```sh
docker compose down
```

### 7. Integration Testing with LocalStack and DynamoDB in CI

Now that your tests are passing locally, let's update our **Continuous Integration** workflow on GitHub to also build and run our containers and hurl tests.

1. Add a new **job** to your `.github/workflows/ci.yml` file named `integration-tests`. In it, we'll do the same steps we did above, but automate them:

```yml
jobs:

  ...

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    steps:
      - name: Check out code
        uses: actions/checkout@v4
      - name: Setup node
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'
      - name: Install node dependencies
        # NOTE: we need to install dev dependencies too vs. production only for hurl
        run: npm install
      - name: Build Containers
        run: docker compose up -d
      - name: Setup Local AWS Resources
        # NOTE: this file needs to be made executable *before* you check into git:
        # $ chmod +x ./scripts/local-aws-setup.sh
        run: ./scripts/local-aws-setup.sh
      - name: Run Hurl Tests
        run: npm run test:integration
```

2. Modify the final `docker-hub` job so that it also **depends on** the `integration-tests` job:

```yml
jobs:
  integration-tests: ...

  docker-hub:
    name: Build and Push to Docker Hub
    # Don't bother running this job unless the other four all pass
    needs: [lint, dockerfile-lint, unit-tests, integration-tests]
```

3. Next `add`, `commit`, and `push` everything to GitHub, and make sure your `ci.yml` workflow runs properly. If any of the steps or jobs fail, fix the issues locally and `push` more commits. Repeat until you have a green build, that includes your integration tests.

### 8. Configure and Deploy to AWS

Now that you know that your DynamoDB code is working, let's deploy an updated version of our service to Elastic Container Service. Using what you learned a few weeks ago in the [Elastic Container Service Walk-through](../../weeks/week-09/fragments-ecs-walkthrough.md), we'll `tag` a new **minor** release of our code and deploy it.

> [!IMPORTANT]
> Make sure you have already updated your `fragments-task.json` to use the `LabRole` in the `executionRoleArn` and `taskRoleArn`. See [Configure and Deploy to AWS > Understanding ECS and IAM Roles in Lab 09](../lab-09/README.md).

To do this, we'll need to do a few things:

1. To do this, we'll need to add our DynamoDB table name (from step 1 above) as an environment variable, `AWS_DYNAMODB_TABLE_NAME`, to our `fragments-task.json` task definition file. You could also do this in your `.github/workflows/cd.yml` file under the [aws-actions/amazon-ecs-render-task-definition](https://github.com/aws-actions/amazon-ecs-render-task-definition) action if you want (either way will work). Since this isn't a secret, and won't be changing, hard-coding it into `fragments-task.json` is safe.
2. Update your local git repo with all the changes you've made (i.e., `add`, `commit`) and `push` to run your CI workflow. Once it passes, create a new `tag` (i.e., `0.10.0`, since this is lab 10):

```sh
npm version 0.10.0
```

7. In your `fragments` GitHub Repo, update your **GitHub Actions Secrets** for your current lab session's **AWS Credentials** (recall that these change every time you restart the Learner Lab). Get your `aws_access_key_id`, `aws_secret_access_key` and `aws_session_token` from the Learner Lab (i.e., under **AWS Details** and the **AWS CLI** button) and use the current values to update your **GitHub Actions Secrets**: in your `fragments` repo go to **Settings** > **Secrets** > **Actions** and click **Update** beside each secret to be updated.
8. Push your new `tag` to GitHub in order to trigger a deployment via your **Continuous Delivery Workflow**:

```sh
git push origin main --tags
```

9. Switch to the **Actions** tab of your `fragments` repo on GitHub, and watch the workflow run. Make sure that it passes. If you run into issues, fix any problems locally, `add` and `commit` the changes, then create another **patch** version tag (e.g., `0.10.1`, `0.10.2`) using `npm version patch`, and `push` with `--tags`. Repeat until you can deploy your application correctly.
10. Once it has successfully deployed, update your `fragments-ui` web app so it uses your **Elastic Container Service Load Balancer URL** as the backend, by changing the `API_URL` it is configured to use instead of <http://localhost:8080>).
11. Try running your `fragments-ui` front-end locally, and **create a new fragment**.
12. In the **AWS Console** for **DynamoDB** navigate to your **table** and make sure you can see that the fragment **item** has been successfully created in AWS.

## Submission

- Link to your completed `tests/integration/lab-10-dynamodb.hurl` in your `fragments` GitHub repo
- Screenshot of your `tests/integration/lab-10-dynamodb.hurl` test passing, when run against your `fragments` server, `LocalStack`, and `DynamoDB Local` using `docker compose` (i.e., show the terminal(s) running the necessary commands to make this happen).
- Screenshot of your `ci.yml` GitHub Actions Workflow passing everything, including your **integration tests**.
- Screenshot of your `fragments-ui` creating a fragment using your **Elastic Container Service** deployment (i.e., show the **Network** tab to prove which back-end service is being used)
- Screenshot of the **AWS DynamoDB Console** showing the fragment you just created in DynamoDB as an **Item** in your **Table** (i.e., prove that you've been able to create the fragment metadata in DynamoDB)
