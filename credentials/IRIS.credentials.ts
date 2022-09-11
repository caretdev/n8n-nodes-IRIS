/* eslint-disable n8n-nodes-base/cred-class-field-display-name-missing-api */
/* eslint-disable n8n-nodes-base/cred-class-name-unsuffixed */
/* eslint-disable n8n-nodes-base/cred-class-field-name-unsuffixed */
import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class IRIS implements ICredentialType {
	name = 'iris';
	displayName = 'InterSystems IRIS';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 1972,
		},
		{
			displayName: 'Namespace',
			name: 'namespace',
			type: 'string',
			default: 'USER',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '_SYSTEM',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
