import { APIGatewayProxyEventQueryStringParameters } from "aws-lambda";

export const getQueryParam = (
    key: string,
    queryParams: APIGatewayProxyEventQueryStringParameters | null,
): string | undefined => {
    if (!queryParams) {
        return undefined;
    }

    return queryParams[key];
};