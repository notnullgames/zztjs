import ZZTGame from '../ZZTGame'

export default class CLIGame extends ZZTGame {
  constructor () {
    super(process.stdout.columns, process.stdout.rows)

    setInterval(this.loop.bind(this), 1000 / this.fps)
  }

  loop () {
    this.width = process.stdout.columns
    this.height = process.stdout.rows
    super.loop()
  }
}
