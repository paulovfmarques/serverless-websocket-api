import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DeleteItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { clientsTable, dynamodbClient } from "../dynamoDB";
import { getQueryParam } from "../utils/getQueryParams";
import { ApiGatewayManagementApi, GoneException } from "@aws-sdk/client-apigatewaymanagementapi";
import { TextEncoder } from "util";

const responseOK = {
    statusCode: 200,
    body: "",
};

const textEncoder = new TextEncoder();

export const handler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    const connectionId = event.requestContext?.connectionId as string;
    const deviceId = getQueryParam("deviceId", event.queryStringParameters) || "";
    const clientType = getQueryParam("clientType", event.queryStringParameters);
    const body = event.body || "";

    const apiGatewayManagementApi = new ApiGatewayManagementApi({
        endpoint: process.env.WSS_API_GATEWAY_ENDPOINT,
    });

    const clientsTableData = await dynamodbClient.send(
        new ScanCommand({
            TableName: clientsTable,
        }),
    );

    const sendMessage = async (connectionId: string, body: string) => {
        try {
            await apiGatewayManagementApi.postToConnection({
                ConnectionId: connectionId,
                Data: textEncoder.encode(body),
            });
        } catch (error: any) {
            context.serverlessSdk.captureError(error);

            if (error instanceof GoneException) {
                await dynamodbClient.send(
                    new DeleteItemCommand({
                        TableName: clientsTable,
                        Key: {
                            deviceId: {
                                S: deviceId,
                            },
                            connectionId: {
                                S: connectionId,
                            },
                        },
                    }),
                );
                return;
            }

            throw new Error(error);
        }
    };

    if (clientsTableData.Count && clientsTableData.Count > 0) {
        for (const item of clientsTableData.Items || []) {
            if (
                item["connectionId"].S !== connectionId &&
                item["deviceId"].S !== deviceId &&
                item["clientType"].S !== clientType
            ) {
                await sendMessage(item["connectionId"].S as string, body);
            }
        }
    } else {
        await sendMessage(
            connectionId,
            JSON.stringify({
                action: "msg",
                type: "warning",
                body: "no recipient",
            }),
        );
    }

    return responseOK;
};