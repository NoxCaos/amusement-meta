const conf          = require('./config')
const cardDates     = require('./result/cardDates')
const MongoClient   = require('mongodb').MongoClient;

const mongoUri = conf.database
const mongoOpt = {useNewUrlParser: true, useUnifiedTopology: true}

const updateDB = async () => {
    console.log(`Connecting to database`)
    const conn = await MongoClient.connect(mongoUri, mongoOpt)
    const db = conn.db('amusement2')
    console.log(`Successfully connected to database`)

    const chunks = array_chunks(cardDates, 1000)

    for (let i = 0; i < chunks.length; i++) {
        const element = chunks[i];
        await db.collection('cardinfos').bulkWrite(
            element.map(x => ({
                updateOne : {
                    'filter' : { 'id' : x.id },
                    'update' : { $set : { 'meta.added' : new Date(x.date) } }
                }
            }))
        )

        console.log(`Chunk ${i + 1} / ${chunks.length} complete`)
    }

    console.log(`Write complete`)
}

const array_chunks = (array, chunk_size) => Array(Math.ceil(array.length / chunk_size)).fill()
    .map((_, index) => index * chunk_size)
    .map(begin => array.slice(begin, begin + chunk_size));

updateDB()
