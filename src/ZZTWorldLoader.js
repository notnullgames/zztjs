export default class ZZTWorldLoader {
  constructor (board) {
    this.board = board
  }

  parseWorldData (stream) {
    const world = {}

    world.worldType = stream.getInt16()
    world.numBoards = stream.getInt16()
    world.playerAmmo = stream.getInt16()
    world.playerGems = stream.getInt16()
    world.playerKeys = new Array(7)
    for (let i = 0; i < 7; ++i) { world.playerKeys[i] = stream.getBoolean() }
    world.playerHealth = stream.getInt16()
    world.playerBoard = stream.getInt16()

    world.playerTorches = stream.getInt16()
    world.torchCycles = stream.getInt16()
    world.energyCycles = stream.getInt16()
    stream.position += 2 /* unused */
    world.playerScore = stream.getInt16()

    world.worldName = stream.getFixedPascalString(20)
    world.flag = new Array(10)
    for (let i = 0; i < 10; ++i) { world.flag[i] = stream.getFixedPascalString(20) }

    world.timeLeft = stream.getInt16()
    stream.position += 2 /* playerdata pointer */
    world.locked = stream.getBoolean()
    world.board = []

    /* board information then starts at offset 512 */
    stream.position = 512

    for (let i = 0; i < world.numBoards; ++i) { world.board.push(this.parseZZTBoard(stream)) }

    return world
  }

  parseZZTBoard (stream) {
    const boardOffset = stream.position
    const boardSize = stream.getInt16()

    this.board.name = stream.getFixedPascalString(50)

    this.board.width = 60
    this.board.height = 25
    this.board.player = null

    const tiles = []
    /* what follows now is RLE data, encoding 1500 tiles */
    while (tiles.length < (this.board.width * this.board.height)) {
      let count = stream.getUint8()
      const typeid = stream.getUint8()
      const color = stream.getUint8()

      /* A count of zero actually means 256 tiles. The built-in editor
           never encodes like this, but some other editors do. */
      if (count === 0) count = 256

      for (let i = 0; i < count; ++i) {
        tiles.push(this.board.makeTile(typeid, color))
      }
    }
    this.board.tiles = tiles

    /* following the RLE data, we then have... */
    this.board.maxPlayerShots = stream.getUint8()
    this.board.isDark = stream.getUint8()
    this.board.exitNorth = stream.getUint8()
    this.board.exitSouth = stream.getUint8()
    this.board.exitWest = stream.getUint8()
    this.board.exitEast = stream.getUint8()
    this.board.restartOnZap = stream.getUint8()
    this.board.onScreenMessage = stream.getFixedPascalString(58) /* never used? */
    this.board.messageTimer = 0
    this.board.playerEnterX = stream.getUint8()
    this.board.playerEnterY = stream.getUint8()
    this.board.timeLimit = stream.getInt16()
    stream.position += 16 /* unused */
    const statusElementCount = stream.getInt16() + 1

    const statusElement = []
    for (let i = 0; i < statusElementCount; ++i) { statusElement.push(this.parseStatusElement(stream)) }

    /* for objects with code pointers referring to a different object, link them. */
    for (let i = 0; i < statusElementCount; ++i) {
      if (statusElement[i].codeLength < 0) { statusElement[i].code = this.statusElement[-this.statusElement[i].codeLength].code }
    }

    this.board.statusElement = statusElement

    /* update all the line characters */
    this.board.updateLines()

    /* jump to next board */
    stream.position = boardOffset + boardSize + 2

    return this.board
  }

  parseStatusElement (stream) {
    const status = {}

    /* x and y coordinates are 1-based for some reason */
    status.x = stream.getUint8() - 1
    status.y = stream.getUint8() - 1

    status.xStep = stream.getInt16()
    status.yStep = stream.getInt16()
    status.cycle = stream.getInt16()

    status.param1 = stream.getUint8()
    status.param2 = stream.getUint8()
    status.param3 = stream.getUint8()

    status.follower = stream.getInt16()
    status.leader = stream.getInt16()
    const underType = stream.getUint8()
    const underColor = stream.getUint8()
    status.underTile = this.board.makeTile(underType, underColor)
    stream.position += 4 /* pointer is not used when loading */
    status.currentInstruction = stream.getInt16()
    status.codeLength = stream.getInt16()

    /* for ZZT and not Super ZZT, eight bytes of padding follow */
    stream.position += 8

    /* if status.codeLength is positive, there is that much ZZT-OOP code following */
    if (status.codeLength > 0) {
      status.code = stream.getFixedString(status.codeLength)
    } else {
      /* it's negative, which means that we'll need to look at a different
           object in order to use it's code instead; we'll do that later. */
      status.code = null
    }

    return status
  }
}
