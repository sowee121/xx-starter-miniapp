const { ICONS } = require('../../content/mascots')

Component({
  options: {
    styleIsolation: 'apply-shared',
  },

  properties: {
    stars: { type: Number, value: 0 },
    night: { type: Boolean, value: false },
  },

  data: {
    starIcon: ICONS.star,
  },
})
