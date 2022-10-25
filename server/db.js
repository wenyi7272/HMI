const mongoose = require('mongoose')
const lodash = require('lodash')

mongoose.connect('mongodb://mongo:27017', {
    user: "root",
    pass: "root",
    dbName: "hc"
})

const schema = new mongoose.Schema({
    id: String,
    type: String,
    location: [{
        x: Number,
        y: Number
    }]
})

const collect = mongoose.model('data', schema);

let self = module.exports = {

    async get( {type} ){
        let data = await collect.find(type ? { type }: { });
        let keys = {};
        for(let item of data){
            if(keys[item.type])
                keys[item.type].push({id: item._id, location: item.location});
            else
                keys[item.type] = [{id: item._id, location: item.location}]
        }
        return keys
    },

    async create({ type, location }){
        await collect.create({type, location});
        return self.get({type})
    },

    async remove({index, type}){
        if(index !== undefined)
            await collect.deleteOne({_id: index});
        else if(type !== undefined)
            await collect.deleteMany({ type });
        return {msg: `DATA_DELETED`};
    }
}

