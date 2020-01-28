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

}

class WithCustomId {
  _id!: string;
  name!: string;
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
    const a = await find(getModelForClass(WithCustomId), {name: 'carl'}, ['name'])
    const id: string = a[0]._id
    ;
  })
})