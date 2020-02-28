"use strict";
/*
 * Almost type safe lean db operations
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("@nestjs/common");
var bson_1 = require("bson");
var swagger_1 = require("@nestjs/swagger");
var common_2 = require("@nestjs/common");
var ParseObjId = /** @class */ (function () {
    function ParseObjId() {
    }
    ParseObjId.prototype.transform = function (value) {
        try {
            return new bson_1.ObjectID(value);
        }
        catch (e) {
            throw new common_2.BadRequestException(e.message);
        }
    };
    ParseObjId = __decorate([
        common_2.Injectable()
    ], ParseObjId);
    return ParseObjId;
}());
exports.ParseObjId = ParseObjId;
exports.objId = new ParseObjId();
exports.toJSON = function (d) {
    d.id = d._id;
    return d;
};
// tslint:disable-next-line: max-classes-per-file
var Cursor = /** @class */ (function () {
    function Cursor() {
    }
    __decorate([
        swagger_1.ApiProperty({ type: 'string' })
    ], Cursor.prototype, "field", void 0);
    __decorate([
        swagger_1.ApiProperty({ type: 'string' })
    ], Cursor.prototype, "from", void 0);
    __decorate([
        swagger_1.ApiProperty({ type: 'number' })
    ], Cursor.prototype, "limit", void 0);
    return Cursor;
}());
exports.Cursor = Cursor;
var getLastValue = function (items, field) {
    var lastVal = items[items.length - 1][field];
    return lastVal instanceof Date ? lastVal.toISOString() : lastVal;
};
exports.find = function (model, query, projection) { return model
    .find(query, projection)
    .lean()
    .then(function (result) { return result.map(exports.toJSON); }); };
exports.paginate = function (model, query, cursorOpts, projection) {
    var _a, _b;
    var cursor = Object.assign({
        field: 'updatedAt',
        limit: 20,
    }, cursorOpts);
    return model
        .find(cursor.from
        ? __assign(__assign({}, query), (_a = {}, _a[cursor.field] = { $lt: cursor.from }, _a)) : query, projection)
        .sort((_b = {}, _b[cursor.field] = -1, _b))
        .limit(cursor.limit ? +cursor.limit : 20)
        .lean()
        .then(function (items) {
        var _a;
        if (items.length === 0) {
            return Promise.resolve({
                items: items,
                hasMore: false,
            });
        }
        var lastVal = getLastValue(items, cursor.field);
        return model.exists(__assign((_a = {}, _a[cursor.field] = { $lt: lastVal }, _a), query)).then(function (hasMore) { return ({
            cursor: __assign(__assign({}, cursor), { from: lastVal }),
            items: items.map(exports.toJSON),
            hasMore: hasMore,
        }); });
    });
};
exports.update = function (model, filter, updateData) { return model
    .findOneAndUpdate(filter, { $set: updateData }, { new: true })
    .lean()
    .then(function (res) { return exports.toJSON(exports.existsOrThrow(res)); }); };
exports.create = function (model, newData) { return model.create(newData)
    .then(function (d) { return exports.toJSON(d.toJSON()); }); };
function findOne(model, filter, projection) {
    return model.findOne(filter, projection)
        .lean()
        .then(function (res) { return exports.toJSON(exports.existsOrThrow(res)); });
}
exports.findOne = findOne;
exports.del = function (model, filter) { return model
    .findByIdAndDelete(filter)
    .lean()
    .then(function (res) { return exports.toJSON(exports.existsOrThrow(res)); }); };
exports.existsOrThrow = function (something) {
    if (!something) {
        throw new common_1.NotFoundException();
    }
    else {
        return something;
    }
};
exports.ifExists = function (model, filter) {
    return model.exists(filter).then(exports.existsOrThrow);
};
