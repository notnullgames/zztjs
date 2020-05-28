export const VGA =
{
  COLOR: [
    [0, 0, 0],
    [0, 0, 170],
    [0, 170, 0],
    [0, 170, 170],
    [170, 0, 0],
    [170, 0, 170],
    [170, 85, 0],
    [170, 170, 170],
    [85, 85, 85],
    [85, 85, 255],
    [85, 255, 85],
    [85, 255, 255],
    [255, 85, 85],
    [255, 85, 255],
    [255, 255, 85],
    [255, 255, 255]
  ],
  ATTR_FG_BLACK: 0x00,
  ATTR_FG_BLUE: 0x01,
  ATTR_FG_GREEN: 0x02,
  ATTR_FG_CYAN: 0x03,
  ATTR_FG_RED: 0x04,
  ATTR_FG_MAGENTA: 0x05,
  ATTR_FG_BROWN: 0x06,
  ATTR_FG_GRAY: 0x07,
  ATTR_FG_DARKGRAY: 0x08,
  ATTR_FG_BBLUE: 0x09,
  ATTR_FG_BGREEN: 0x0A,
  ATTR_FG_BCYAN: 0x0B,
  ATTR_FG_BRED: 0x0C,
  ATTR_FG_BMAGENTA: 0x0D,
  ATTR_FG_YELLOW: 0x0E,
  ATTR_FG_WHITE: 0x0F,
  ATTR_BG_BLACK: 0x00,
  ATTR_BG_BLUE: 0x10,
  ATTR_BG_GREEN: 0x20,
  ATTR_BG_CYAN: 0x30,
  ATTR_BG_RED: 0x40,
  ATTR_BG_MAGENTA: 0x50,
  ATTR_BG_BROWN: 0x60,
  ATTR_BG_GRAY: 0x70,
  ATTR_BLINK: 0x80,
  foregroundColorFromAttribute (attr) {
    return (attr & 0x0F)
  },
  backgroundColorFromAttribute (attr) {
    return ((attr & 0x70) >> 4)
  }
}

class ZZTTile {
  constructor (typeid, color, objects) {
    this.typeid = typeid
    this.color = color
    this.properties = objects[this.typeid]
  }
}

export default class ZZTBoard {
  constructor (objects) {
    this.actorIndex = 0
    this.tick = 0
    this.objects.types = objects

    this.boardEmpty = new ZZTTile(0, 0, this.objects.types)
    this.boardEdge = new ZZTTile(1, 0, this.objects.types)
  }

  getTileRenderInfo (tile) {
  /* specific check for zero here because town.zzt has some 'empty' cells marked w/color,
      possible editor corruption? */
    if (tile.typeid === 0 || !tile.properties) { return { ...this.objects.types[0] } }

    if (tile.properties.isText) {
    /* For text, the tile's 'color' is the glyph, and the element type determines the color. */
      return { glyph: tile.color, color: tile.properties.color }
    } else {
      return { glyph: tile.properties.glyph, color: tile.color }
    }
  }

  /* Construct a tile, with a special case for empties: empty tiles have no color,
   so we can reuse the same reference for all of them. */
  makeTile (typeid, color) {
    if (typeid === 0) { return this.boardEmpty } else { return new ZZTTile(typeid, color, this.objects.types) }
  }

  withinBoard (x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) { return false } else { return true }
  }

  get (x, y) {
    if (!this.withinBoard(x, y)) { return this.boardEdge } else { return this.tiles[y * this.width + x] }
  }

  getActorIndexAt (x, y) {
    for (let i = 0; i < this.statusElement.length; ++i) {
      if (this.statusElement[i].x === x && this.statusElement[i].y === y) { return i }
    }
    return -1
  }

  getActorAt (x, y) {
    const index = this.getActorIndexAt(x, y)
    if (index >= 0) { return this.statusElement[index] } else { return null }
  }

  set (x, y, tile) {
    this.tiles[y * this.width + x] = tile
  }

  update () {
    if (this.actorIndex >= this.statusElement.length) {
      this.tick++
      /* According to roton the tick counter wraps at 420. */
      if (this.tick > 420) { this.tick = 1 }
      this.actorIndex = 0
    }

    while (this.actorIndex < this.statusElement.length) {
      const actor = this.statusElement[this.actorIndex]
      const cycle = actor.cycle
      if (cycle !== 0) {
        if (!(this.tick % cycle)) {
          const tile = this.get(actor.x, actor.y)
          if (tile.properties.update) { tile.properties.update(this, this.actorIndex) }
        }
      }
      this.actorIndex++
    }
  }

  remove (x, y) {
    this.set(x, y, this.boardEmpty)
  }

  move (sx, sy, dx, dy) {
    const actorIndex = this.getActorIndexAt(sx, sy)
    if (actorIndex < -1) {
      /* not an actor, just move tile */
      this.set(dx, dy, this.get(sx, sy))
      this.remove(sx, sy)
    } else {
      this.moveActor(actorIndex, dx, dy)
    }
  }

  moveActor (actorIndex, x, y) {
    const actorData = this.statusElement[actorIndex]
    const srcTile = this.get(actorData.x, actorData.y)

    this.set(actorData.x, actorData.y, actorData.underTile)
    this.set(x, y, srcTile)

    actorData.x = x
    actorData.y = y
  }

  draw (textconsole) {
    for (let y = 0; y < this.height; ++y) {
      for (let x = 0; x < this.width; ++x) {
        const tile = this.get(x, y)
        let renderInfo = null

        if (tile.properties.draw) {
          renderInfo = tile.properties.draw(this, x, y)
        } else {
          renderInfo = this.getTileRenderInfo(tile)
        }
        textconsole.set(x, y, renderInfo.glyph, renderInfo.color)
      }
    }

    if (this.messageTimer > 0) {
      /* TODO: actually work out how to make this multiline */
      textconsole.setString(
        Math.floor((this.width / 2) - (this.onScreenMessage.length / 2)),
        24,
        this.onScreenMessage,
        (this.messageTimer % 6) + VGA.ATTR_FG_BBLUE)
      --this.messageTimer
    }
  }

  setMessage (msg) {
    /* TODO: actually work out how to make this multiline */
    if (msg.length >= (this.width - 2)) {
      msg = msg.substr(0, (this.width - 2))
    }
    this.onScreenMessage = ` ${msg} `
    this.messageTimer = 24
  }

  /* Update the glyphs of all line characters on the board.
      We only need to do this whenever one of them changes. */
  updateLines () {
    for (let y = 0; y < this.height; ++y) {
      for (let x = 0; x < this.width; ++x) {
        const tile = this.get(x, y)
        if (tile.name === 'line') {
          let glyphIndex = 0
          if ((y === 0) || (this.get(x, y - 1).name === 'line')) { glyphIndex += 8 }
          if ((x === this.width - 1) || (this.get(x + 1, y).name === 'line')) { glyphIndex += 4 }
          if ((y === this.height - 1) || (this.get(x, y + 1).name === 'line')) { glyphIndex += 2 }
          if ((x === 0) || (this.get(x - 1, y).name === 'line')) { glyphIndex += 1 }
          tile.glyph = lineGlyphs[glyphIndex]
        }
      }
    }
  }
}

const lineGlyphs =
[
  /* NESW */
  /* 0000 */ 249,
  /* 0001 */ 181,
  /* 0010 */ 210,
  /* 0011 */ 187,
  /* 0100 */ 198,
  /* 0101 */ 205,
  /* 0110 */ 201,
  /* 0111 */ 203,
  /* 1000 */ 208,
  /* 1001 */ 188,
  /* 1010 */ 186,
  /* 1011 */ 185,
  /* 1100 */ 200,
  /* 1101 */ 202,
  /* 1110 */ 204,
  /* 1111 */ 206
]
