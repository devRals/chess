export type PlayerId = string;

export class Player {
  id: PlayerId;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}
