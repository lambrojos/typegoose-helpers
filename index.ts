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


export const toJSON = <T extends Timestamped>(d: T): T => {
  d.id = d._id;
  return d;
};

type Filter<T> = Partial<T> & {_id?: string | ObjectID};
interface Timestamped {
  _id?: string;
  id?: string;
  updatedAt?: Date | undefined;
}

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
  .then((items: T[]) => {
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
): Promise<T> => model
  .findOneAndUpdate(filter,
    { $set: updateData }, { new: true })
  .lean()
  .then((res: T) => toJSON(existsOrThrow(res)));

export const create = <T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  newData: Partial<T>,
): Promise<T> => model.create(newData)
  .then((d: DocumentType<T>) => toJSON(d.toJSON()));

export const findOne = <T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
  projection?: string[], // could containe "-<propertyname>" so we can't keyof T
): Promise<T> => model.findOne(filter, projection)
  .lean()
  .then((res: T) => toJSON(existsOrThrow(res)));

export const del = <T>(
  model: ReturnModelType<AnyParamConstructor<T>>,
  filter: Filter<T>,
): Promise<T> => model
    .findByIdAndDelete(filter)
    .lean()
    .then((res: T) => toJSON(existsOrThrow(res)));

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

