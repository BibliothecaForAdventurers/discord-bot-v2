const fetch = require('node-fetch');
const Discord = require('discord.js');
const { openseaAssetUrl, openseaEventsUrl } = require('../config.json');
const checkRealmRarity = require('../useRarity');

var listingCache = [];
var lastTimestamp = null;

module.exports = {
  name: 'listing',
  description: 'listing bot',
  interval: 30000,
  enabled: process.env.DISCORD_LISTING_CHANNEL_ID != null,
  async execute(client) {
    if (lastTimestamp == null) {
      lastTimestamp = Math.floor(Date.now() / 1000) - 120;
    } else {
      lastTimestamp -= 30;
    }
    let newTimestamp = Math.floor(Date.now() / 1000) - 30;
    // we're retrieving events from -90 to -30 seconds ago each time, and each query overlaps the previous query by 30 seconds
    // doing this to try to resolve some intermittent issues with events being missed by the bot, suspect it's due to OpenSea api being slow to update the events data
    // duplicate events are filtered out by the listingCache array

    let offset = 0;
    let settings = {
      method: "GET",
      headers: process.env.OPEN_SEA_API_KEY == null ? {} : {
        "X-API-KEY": process.env.OPEN_SEA_API_KEY
      }
    };
    while (1) {
      let url = `${openseaEventsUrl}?collection_slug=${process.env.OPEN_SEA_COLLECTION_NAME}&event_type=created&only_opensea=false&offset=${offset}&limit=50&occurred_after=${lastTimestamp}&occurred_before=${newTimestamp}`;
      try {
        var res = await fetch(url, settings);
        if (res.status != 200) {
          throw new Error(`Couldn't retrieve events: ${res.statusText}`);
        }

        let data = await res.json();
        if (data.asset_events.length == 0) {
          break;
        }

        data.asset_events.forEach(async function (event) {
          if (event.asset) {
            if (listingCache.includes(event.id)) {
              return;
            } else {
              listingCache.push(event.id);
              if (listingCache.length > 200) listingCache.shift();
            }


            const embedMsg = new Discord.MessageEmbed()
              .setColor('#0099ff')
              .setTitle(event.asset.name)
              .setURL(event.asset.permalink)
              .setDescription(`has just been listed for ${event.starting_price / (1e18)}\u039E`)
              .addField("By", `[${event.seller.user?.username || event.seller.address.slice(0, 8)}](https://etherscan.io/address/${event.seller.address})`, true)

            let openSeaResponseUrl = `${openseaAssetUrl}/${process.env.CONTRACT_ADDRESS}/${event.asset.token_id}`;

            try {
              var res = await fetch(openSeaResponseUrl, settings);
              if (res.status != 200) {
                throw new Error(`Couldn't retrieve events: ${res.statusText}`);
              }

              let data = await res.json();
              console.log(data)

              const rarity = checkRealmRarity(data.traits).toFixed(2)

              const resources = data.traits.filter(resource => resource.trait_type === 'Resource').map(a => a.value);

              const cities = data.traits.find(resource => resource.trait_type === 'Cities')
              const harbors = data.traits.find(resource => resource.trait_type === 'Harbors')
              const regions = data.traits.find(resource => resource.trait_type === 'Regions')
              const rivers = data.traits.find(resource => resource.trait_type === 'Rivers')
              const order = data.traits.find(resource => resource.trait_type === 'Order')
              const wonder = data.traits.find(resource => resource.trait_type === 'Wonder (translated)')


              embedMsg.addField('Order', order.value, true)
              embedMsg.addField('Rarity', rarity, true)
              embedMsg.addField('Resources', resources, true)
              embedMsg.addField('Traits', `Cities ${cities.value}/21\n Regions ${regions.value}/7\n Harbors ${harbors.value}/35\n Rivers ${rivers.value}/60\n`, true)
              if (wonder) {
                embedMsg.addField('Wonder', wonder.value, true)
              }
            } catch (e) {
              console.log(e)
            }
            client.channels.fetch(process.env.DISCORD_LISTING_CHANNEL_ID)
              .then(channel => {
                channel.send(embedMsg);
              })
              .catch(console.error);
          }
        });

        offset += data.asset_events.length;
      }
      catch (error) {
        console.error(error);
        return;
      }
    }

    lastTimestamp = newTimestamp;
  }
};
