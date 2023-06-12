import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { clientsTable, dynamodbClient } from "../dynamoDB";
import { getQueryParam } from "../utils/getQueryParams";
import { PutItemCommand, ScanCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const responseOK = {
    statusCode: 200,
    body: "",
};

enum ClientType {
    Device = "device",
    Browser = "browser",
}

export const handler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    try {
        const connectionId = event.requestContext?.connectionId as string;
        const clientType = getQueryParam("clientType", event.queryStringParameters) || ClientType.Device;
        const deviceId = getQueryParam("deviceId", event.queryStringParameters) || "";

        const clientsTableData = await dynamodbClient.send(
            new ScanCommand({
                TableName: clientsTable,
            }),
        );

        const matchingClient =
            clientsTableData.Items?.find((item) => item.deviceId.S === deviceId) || false;

        if (matchingClient) {
            // If the client already exists, delete it first
            await dynamodbClient.send(
                new DeleteItemCommand({
                    TableName: clientsTable,
                    Key: {
                        deviceId: {
                            S: deviceId,
                        },
                        connectionId: {
                            S: matchingClient.connectionId.S as string,
                        },
                    },
                }),
            );

            await dynamodbClient.send(
                new PutItemCommand({
                    TableName: clientsTable,
                    Item: {
                        deviceId: {
                            S: deviceId,
                        },
                        clientType: {
                            S: clientType,
                        },
                        connectionId: {
                            S: connectionId,
                        },
                        expiresAt: {
                            N: (Math.floor(Date.now() / 1000) + 60 * 60).toString(),
                        },
                    },
                }),
            );
        } else {
            await dynamodbClient.send(
                new PutItemCommand({
                    TableName: clientsTable,
                    Item: {
                        deviceId: {
                            S: deviceId,
                        },
                        clientType: {
                            S: clientType,
                        },
                        connectionId: {
                            S: connectionId,
                        },
                        expiresAt: {
                            N: (Math.floor(Date.now() / 1000) + 60 * 60).toString(),
                        },
                    },
                }),
            );
        }
    } catch (error: any) {
        context.serverlessSdk.captureError(error);
        return {
            statusCode: 500,
            body: error.message,
        };
    }

    return responseOK;
};