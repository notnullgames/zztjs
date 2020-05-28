import ZZTBoard from './ZZTBoard'
import ZZTWorldLoader from './ZZTWorldLoader'
import ZZTObjects from './ZZTObjects'

export default class ZZTGame {
  constructor (width = 80, height = 25) {
    this.width = width
    this.height = height

    this.inputEvent = 0
    this.quiet = false
    this.fps = 9.1032548384
    this.debug = true
    this.dialog = null
    this.tick = 0

    this.objects = new ZZTObjects(this)
    this.board = new ZZTBoard(this.objects)
    this.world = new ZZTWorldLoader(this.board)

    // load world & setup loop in subclass
  }

  loop () {

  }
}
