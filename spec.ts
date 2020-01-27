// just testing types for now
import { prop, getModelForClass } from "@typegoose/typegoose";
import { create, existsOrThrow, find, findOne } from ".";
import { ObjectID } from 'bson';

class Document {
  @prop()
  name?: string;

  @prop()
  description?: string;

  @prop()
  tags?: string;

  _id!: 'BOB';
}

const documentModel = getModelForClass(Document);

describe('create', () => {
  it('creates stuff', async() => {
    const doc = create(documentModel, {name: 'gino'});
    const id: ObjectID = (await doc).id
  });
});

describe('existorThrow', () => {
  it('filters out undefineds', () => {
    const a: NonNullable<number> = existsOrThrow(null);
  })
})

describe('find', () => {
  it('finds', async () => {
    const a = await find(documentModel, {name: 'carl'}, ['tags'])
    const BOB: 'BOB' = a[0]._id
    ;
  })
})