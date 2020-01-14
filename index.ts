/*
 * Almost type safe lean db operations
 */

import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { AnyParamConstructor } from '@typegoose/typegoose/lib/types';
import { NotFoundException } from '@nestjs/common';
import { ObjectID } from 'bson';
import { ApiModelProperty } from '@nestjs/swagger';

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseObjId implements PipeTransform<string, ObjectID> {
  transform(value: string): ObjectID {
    try {
        return new ObjectID(value);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}

export const objId = new ParseObjId();

export const toJSON = <T extends {_id: string, id?: string}>(d: T): WithId<T> => {
  d.id = d._id;
  return d as WithId<T>;
};

interface MongoOperators<T> {
  $ne?: T | null;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
}

type AllowOperators<T> = {
  [P in keyof T]: T[P] | MongoOperators<T[P]>
};

type Filter<T> = AllowOperators<Partial<T>> & {_id?: string | ObjectID};
type Projected<T, P extends Array<keyof T>> = Pick<T, P[number]> & {};
type WithId<T> = T & { id: ObjectID, _id: ObjectID };

// TODO id handling is still very uncool
interface Timestamped {
  updatedAt?: Date;
}

// tslint:disable-next-line: max-classes-per-file
export class Cursor<T, K extends keyof T> {
  @ApiModelProperty({ type: 'string'})
  field!: K;
  @ApiModelProperty({ type: 'string'})
  from?: T[K];
  @ApiModelProperty({ type: 'number'})
  limit?: string | number;
}

export interface CursorResult<T, K extends keyof T> {
  items: T[];
  cursor: Cursor<T, K>;
  hasMore: boolean;
}

const getLastValue = <T>(items: T[], field: keyof T) => {
  const lastVal = items[items.length - 1][field];
  return lastVal instanceof Date ? lastVal.toISOString() : lastVal;
};

export const paginate = <T extends Timestamped, K extends keyof T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  query: Filter<T>,
  cursorOpts: Cursor<T, K>,
  projection?: Array<keyof T>,
) => {
  const cursor = Object.assign({
    field: 'updatedAt',
    limit: 20,
  }, cursorOpts);

  return model
  .find( cursor.from
    ? { ...query, [cursor.field]: { $lt: cursor.from  }}
    : query,
    projection,
  )
  .sort({[cursor.field]: -1})
  .limit(cursor.limit ? +cursor.limit : 20)
  .lean()
  .then((items: Array<T & {_id: string}>) => {
    if (items.length === 0) {
      return Promise.resolve({
        items,
        hasMore: false,
      });
    }
    const lastVal = getLastValue(items, cursor.field);
    return model.exists({
      [cursor.field]: { $lt: lastVal},
      ...query,
    }).then((hasMore: boolean) => ({
      cursor: { ...cursor, from: lastVal },
      items: items.map(toJSON),
      hasMore,
    }));
  });
};

export const update = <T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
  updateData: Partial<T>,
): Promise<WithId<T>> => model
  .findOneAndUpdate(filter,
    { $set: updateData }, { new: true })
  .lean()
  .then((res: T & {_id: string}) => toJSON(existsOrThrow(res)));

export const create = <T, S extends Partial<T>>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  newData: S,
  ): Promise<WithId<T & S>> => model.create(newData)
  .then((d: DocumentType<T>) => toJSON(d.toJSON()));

export function findOne<T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
): Promise<WithId<T>>;
export function findOne<T, P extends Array<keyof T>>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
  projection: P,
): Promise<WithId<Projected<T, P>>>;
export function findOne<T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
  projection: string | string[],
): Promise<WithId<Partial<T>>>;
export function findOne<T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
  projection?: string[] | string,
): Promise<WithId<Partial<T> | T>> {
  return model.findOne(filter, projection)
  .lean()
  .then((res: T & {_id: string}) => toJSON(existsOrThrow(res)));
}

export const del = <T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
): Promise<WithId<T>> => model
    .findByIdAndDelete(filter)
    .lean()
    .then((res: T & {_id: string}) => toJSON(existsOrThrow(res)));

export const existsOrThrow = <T>(something: T | null): T => {
  if (!something ) {
    throw new NotFoundException();
  } else {
    return something!;
  }
};

export const ifExists = <T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
  ): Promise<boolean> =>
    model.exists(filter).then(existsOrThrow);

