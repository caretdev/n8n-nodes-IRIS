/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-class-description-credentials-name-unsuffixed */
import { IExecuteFunctions } from 'n8n-core';
import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { IRIS as irisdb } from 'intersystems-iris';
import { connect, insert, query, update } from './IRIS.node.functions';

export class IRIS implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'InterSystems IRIS',
		name: 'iris',
		icon: 'file:intersystems.svg',
		group: ['input'],
		version: 1,
		description: 'Get, add and update data in InterSystems IRIS',
		defaults: {
			name: 'IRIS',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'iris',
				required: true,
				testedBy: 'connectionTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute an SQL query',
						action: 'Execute a SQL query',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database',
						action: 'Insert rows in database',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows in database',
						action: 'Update rows in database',
					},
				],
				default: 'insert',
			},

			// ----------------------------------
			//         executeQuery
			// ----------------------------------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: '',
				placeholder: 'SELECT id, name FROM product WHERE quantity > $1 AND price <= $2',
				required: true,
				description:
					'The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with query parameters.',
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParams',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Parameter',
				},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: [],
				description: 'List of properties which should be used as query parameters',
			},

			// ----------------------------------
			//         insert
			// ----------------------------------
			{
				displayName: 'Table Name or ID',
				name: 'table',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'loadTables',
				},
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: '',
				required: true,
				description:
					'Name of the table in which to insert data to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Column',
				},
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: [],
				options: [
					{
						name: 'column',
						displayName: 'Column',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['table'],
									loadOptionsMethod: 'loadTableColumns',
								},
								default: '',
								description:
									'Column Name. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Column Value',
								required: true,
							},
						],
					},
				],
				// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
				// placeholder: 'id:int,name:text,description',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'List of the properties which should used as columns for the new rows. You can use type casting with colons (:) like id:int.',
			},

			// // ----------------------------------
			// //         update
			// // ----------------------------------
			// {
			// 	displayName: 'Table',
			// 	name: 'table',
			// 	type: 'string',
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['update'],
			// 		},
			// 	},
			// 	default: '',
			// 	required: true,
			// 	description: 'Name of the table in which to update data in',
			// },
			// {
			// 	displayName: 'Update Key',
			// 	name: 'updateKey',
			// 	type: 'string',
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['update'],
			// 		},
			// 	},
			// 	default: 'id',
			// 	required: true,
			// 	// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
			// 	description:
			// 		'Comma-separated list of the properties which decides which rows in the database should be updated. Normally that would be "id".',
			// },
			// {
			// 	displayName: 'Columns',
			// 	name: 'columns',
			// 	type: 'string',
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['update'],
			// 		},
			// 	},
			// 	default: '',
			// 	placeholder: 'name:text,description',
			// 	// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
			// 	description:
			// 		'Comma-separated list of the properties which should used as columns for rows to update. You can use type casting with colons (:) like id:int.',
			// },
		],
	};

	methods = {
		loadOptions: {
			async loadTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const sql = `
SELECT STRING(TABLE_SCHEMA, '.', TABLE_NAME) tableName FROM INFORMATION_SCHEMA.TABLES
WHERE NOT TABLE_TYPE %STARTSWITH 'SYSTEM'
AND NOT TABLE_SCHEMA %STARTSWITH 'Ens'`;
				const db = connect(await this.getCredentials('iris'));

				const queryResult = await db.sql(sql);
				return queryResult.rows.map((row) => {
					const tableName = row['tableName'] as string;
					return {
						name: tableName,
						value: tableName,
					};
				});
			},
			async loadTableColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const [tableSchema, tableName] = (this.getCurrentNodeParameter('table') as string).split(
					'.',
				);
				const sql = `SELECT COLUMN_NAME columnName FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${tableSchema}' AND TABLE_NAME = '${tableName}'`;
				const db = connect(await this.getCredentials('iris'));

				const queryResult = await db.sql(sql);
				return queryResult.rows.map((row) => {
					const columnName = row['columnName'] as string;
					return {
						name: columnName,
						value: columnName,
					};
				});
			},
		},
		credentialTest: {
			async connectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					const db = connect(credential.data);
					db.close();
				} catch (error) {
					console.log(error);
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		let returnItems: INodeExecutionData[] = [];

		let db: irisdb | undefined;
		try {
			db = connect(await this.getCredentials('iris'));

			if (operation === 'executeQuery') {
				const queryResults = await query.call(this, db, items, this.continueOnFail());
				returnItems = queryResults.flatMap((queryResult, i) => {
					return this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(queryResult.rows),
						{ itemData: { item: i } },
					);
				});
			} else if (operation === 'insert') {
				const queryResults = await insert.call(this, db, items, this.continueOnFail());
				returnItems = queryResults.flatMap((queryResult, i) => {
					return this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(queryResult.rows),
						{ itemData: { item: i } },
					);
				});
			} else if (operation === 'update') {
				const queryResults = await update.call(this, db, items, this.continueOnFail());
				returnItems = queryResults.flatMap((queryResult, i) => {
					return this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(queryResult.rows),
						{ itemData: { item: i } },
					);
				});
			}
		} catch (error) {
			console.error(error);
			throw error;
		} finally {
			if (db) {
				await db.close();
			}
		}
		return this.prepareOutputData(returnItems);
	}
}
