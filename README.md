# Typegoose helpers

Just a proof of concpet of some canned typegoose queries and _id conversion.
Meant to be used alongside nestjs

Tries to be a somewhat typesafe way of interacting with mongoose. 

Currently supports basic crud and cursor based pagination (supports only an updateAt field, desc ordering and has a 20 items fixed page size)
