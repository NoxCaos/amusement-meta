const AWS = require('aws-sdk')
const fs = require('fs')
const conf = require('./config')

const acceptedExts = ['png', 'gif', 'jpg']
let data = {}, passes = 1
const newcols = [], cardDates = []

const localData = {
    cards: require(conf.data.cards),
    collections: require(conf.data.collections),
}

console.log(`Connecting to spaces`)

const endpoint = new AWS.Endpoint(conf.aws.endpoint)
const s3 = new AWS.S3({
    endpoint, 
    accessKeyId: conf.aws.s3accessKeyId, 
    secretAccessKey: conf.aws.s3secretAccessKey
})

const params = { Bucket: conf.aws.bucket, MaxKeys: 2000 }

console.log(`Successfully connected to spaces`)

const scan = async () => {
    do {
        try {
            let count = 0
            data = await s3.listObjects(params).promise()
            params.Marker = data.Contents[data.Contents.length - 1].Key
            data.Contents
                .filter(x => x.Key.startsWith('cards/') || x.Key.startsWith('promo/'))
                .map(x => {
                const item = x.Key.split('.')[0]
                const ext = x.Key.split('.')[1]
                const split = item.split('/').filter(x => x != "")

                if(split.length === 2) {
                    const col = localData.collections.find(c => c.id === split[1])
                    console.log(`Col: ${col}`)
                    if (col) {
                        col.dateAdded = x.LastModified
                        newcols.push(col)
                    }
                }
                else if(ext && acceptedExts.includes(ext)) {
                    console.log(`Item: ${item}`)
                    if(split.length === 3) {
                        const card = getCardObject(split[2] + '.' + ext, split[1])
                        const localCard = localData.cards.find(x => 
                            x.name === card.name 
                            && x.level === card.level 
                            && x.col === card.col)

                        cardDates.push({
                            id: localCard.id,
                            date: x.LastModified,
                        })
                    }
                }
            })

            console.log(`Pass ${passes}`)
            passes++
        } catch (e) {
            return console.log(e)
        }
    } while(data.IsTruncated)

    console.log('Writing new data to disk')
    fs.writeFileSync(`result/collections.json`, 
        JSON.stringify(newcols.sort((a, b) => a.dateAdded - b.dateAdded), null, 2))
    fs.writeFileSync(`result/cardDates.json`, 
        JSON.stringify(cardDates.sort((a, b) => a.id - b.id), null, 2))
}

const getCardObject = (name, collection) => {
    name = name
        .replace(/ /g, '_')
        .replace(/'/g, '')
        .trim()
        .toLowerCase()
        .replace(/&apos;/g, "")

    const split = name.split('.')
    return {
        name: split[0].substr(2),
        col: collection,
        level: parseInt(name[0]),
        animated: split[1] === 'gif'
    }
}

scan()