import { IExecuteFunctions } from 'n8n-core';
import {
	GenericValue,
	ICredentialDataDecryptedObject,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import { IRIS as irisdb, IRISQueryResult } from 'intersystems-iris';

export function connect(credentials?: ICredentialDataDecryptedObject): irisdb {
	if (credentials) {
		const { host, port, namespace, user, password } = credentials as IDataObject;
		const db = new irisdb(
			host as string,
			port as number,
			namespace as string,
			user as string,
			password as string,
		);
		return db;
	}
	throw new Error('No Credentials Proviced');
}

/**
 * Returns of a shallow copy of the items which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData[]} items The items to copy
 * @param {string[]} properties The properties it should include
 * @returns
 */
export function getItemsCopy(
	items: INodeExecutionData[],
	properties: string[],
	guardedColumns?: { [key: string]: string },
): IDataObject[] {
	let newItem: IDataObject;
	return items.map((item) => {
		newItem = {};
		if (guardedColumns) {
			Object.keys(guardedColumns).forEach((column) => {
				newItem[column] = item.json[guardedColumns[column]];
			});
		} else {
			for (const property of properties) {
				newItem[property] = item.json[property];
			}
		}
		return newItem;
	});
}

function toSQL(value: GenericValue): string {
	const typeValue = typeof value;
	switch (typeValue) {
		case 'boolean':
			value = `${value ? 1 : 0}`;
			break;
		case 'number':
			value = `${value}`;
			break;
		default:
			value = `'${(value as string).replace(/'/g, "''")}'`;
	}
	return value;
}

function injectParams(query: string, queryParams: GenericValue[]): string {
	let newQuery = query;
	console.log('injectParams', query, queryParams);
	queryParams.forEach((param, i) => {
		newQuery = newQuery.replace(new RegExp(`\\$${i + 1}`, 'g'), toSQL(param));
		console.log('inject', `$${i + 1}`, toSQL(param));
	});
	return newQuery;
}

export async function query(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	db: irisdb,
	items: INodeExecutionData[],
	continueOnFail = false,
	overrideMode?: string,
): Promise<IRISQueryResult[]> {
	const result: IRISQueryResult[] = [];

	for (let i = 0; i < items.length; i++) {
		const queryParams = this.getNodeParameter('queryParams', i) as GenericValue[];
		const query = injectParams(this.getNodeParameter('query', i) as string, queryParams);
		console.log(query);
		const queryResult = await db.sql(query);
		result.push(queryResult);
	}
	return result;
}

export async function insert(
	this: IExecuteFunctions,
	db: irisdb,
	items: INodeExecutionData[],
	continueOnFail = false,
	overrideMode?: string,
): Promise<IRISQueryResult[]> {
	const result: IRISQueryResult[] = [];

	for (let i = 0; i < items.length; i++) {
		const table = this.getNodeParameter('table', i) as IDataObject[];
		const columns = this.getNodeParameter('columns', i) as { column: IDataObject[] };
		const values = columns.column.map(({ name, value }) => `${name} = ${toSQL(value)}`);
		const query = `INSERT INTO ${table} SET ${values.join(', ')}`;
		const queryResult = await db.sql(query);
		result.push(queryResult);
	}
	return result;
}

export async function update(
	this: IExecuteFunctions,
	db: irisdb,
	items: INodeExecutionData[],
	continueOnFail = false,
	overrideMode?: string,
): Promise<IRISQueryResult[]> {
	const result: IRISQueryResult[] = [];

	for (let i = 0; i < items.length; i++) {
		const table = this.getNodeParameter('table', i) as IDataObject[];
		const columns = this.getNodeParameter('columns', i) as IDataObject[];
		console.log('update', table, columns);
	}
	return result;
}
