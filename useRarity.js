const resource = require('./resource.json')

const checkRealmRarity = (realm) => {
    let score = 0

    const attribute = realm

    for (let e = 0; e < attribute.length; e++) {
      if (attribute[e].trait_type === 'Regions') {
        const add = (attribute[e].value / 7) * 3
        score = score + add
      } else if (attribute[e].trait_type === 'Harbors') {
        const add = (attribute[e].value / 35) * 3
        score = score + add
      } else if (attribute[e].trait_type === 'Cities') {
        const add = (attribute[e].value / 21) * 3
        score = score + add
      } else if (attribute[e].trait_type === 'Rivers') {
        const add = (attribute[e].value / 60) * 3
        score = score + add
      } else {
        for (let i = 0; i < resource.length; i++) {
          if (attribute[e].value === resource[i].Trait) {
            const add = 1 / (resource[i].Value / 8000)
            score = score + add
          }
        }
      }
    }
    return score
  }



  module.exports = checkRealmRarity
