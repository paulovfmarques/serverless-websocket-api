import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const clientsTable = process.env["CLIENTS_TABLE_NAME"] || "";

export const dynamodbClient = new DynamoDBClient({});