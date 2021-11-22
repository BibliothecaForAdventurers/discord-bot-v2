const fetch = require('node-fetch');
const { openseaAssetUrl } = require('../config.json');

const Discord = require('discord.js');
const checkRealmRarity = require('../useRarity');

module.exports = {
  name: process.env.DISCORD_TOKEN_COMMAND || "token",
  execute(message, args) {
    if (!args.length) {
      return message.channel.send(`You didn't provide a token id, ${message.author}!`);
    }

    if (isNaN(parseInt(args[0]))) {
      return message.channel.send(`Token id must be a number!`);
    }

    let url = `${openseaAssetUrl}/${process.env.CONTRACT_ADDRESS}/${args[0]}`;
    let settings = {
      method: "GET",
      headers: process.env.OPEN_SEA_API_KEY == null ? {} : {
        "X-API-KEY": process.env.OPEN_SEA_API_KEY
      }
    };

    fetch(url, settings)
      .then(res => {
        if (res.status == 404 || res.status == 400) {
          throw new Error("Token id doesn't exist.");
        }
        if (res.status != 200) {
          throw new Error(`Couldn't retrieve metadata: ${res.statusText}`);
        }
        return res.json();
      })
      .then((metadata) => {
          const rarity = checkRealmRarity(metadata.traits).toFixed(2)


            const embedMsg = new Discord.MessageEmbed()
              .setColor('#0099ff')
              .setTitle(metadata.name)
              .setURL(metadata.permalink)
              .addField("Owner", metadata.owner.user?.username || metadata.owner.address.slice(0, 8))

            const resources = metadata.traits.filter(resource => resource.trait_type === 'Resource').map(a => a.value);

            const cities = metadata.traits.find(resource => resource.trait_type === 'Cities')
            const harbors = metadata.traits.find(resource => resource.trait_type === 'Harbors')
            const regions = metadata.traits.find(resource => resource.trait_type === 'Regions')
            const rivers = metadata.traits.find(resource => resource.trait_type === 'Rivers')
            const order = metadata.traits.find(resource => resource.trait_type === 'Order')
            const wonder = metadata.traits.find(resource => resource.trait_type === 'Wonder (translated)')


            embedMsg.addField('Resources', resources, true)
            embedMsg.addField('Traits', `Cities ${cities.value}/21\n Regions ${regions.value}/7\n Harbors ${harbors.value}/35\n Rivers ${rivers.value}/60\n`, true)
            embedMsg.addField('Order', order.value, true)
            embedMsg.addField('Rarity', rarity, true)
            if (wonder) {
              embedMsg.addField('Wonder', wonder.value, true)
            }
            message.channel.send( embedMsg);
        })
    
      .catch(error => message.channel.send(error.message));
  },
};