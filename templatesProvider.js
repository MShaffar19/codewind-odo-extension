/*******************************************************************************
 * 
 * Copyright (c) 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 * 
 *******************************************************************************/

'use strict';

const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');


const CODEWIND_ODO_EXTENSION_BASE_PATH = '/codewind-workspace/.extensions/codewind-odo-extension';
const MASTER_INDEX_JSON_FILE = CODEWIND_ODO_EXTENSION_BASE_PATH + '/templates/master-index.json';
const RECONCILED_INDEX_JSON_FILE = CODEWIND_ODO_EXTENSION_BASE_PATH + '/templates/index.json';
const JSON_FILE_URL = 'file://' + RECONCILED_INDEX_JSON_FILE;
const ODO_CATALOG_LIST_COMMAND = CODEWIND_ODO_EXTENSION_BASE_PATH + '/bin/odo catalog list components | tail -n+2';


module.exports = {
    getRepositories: async function() {
        return new Promise((resolve, reject) => {

            // Read master-index.json of currently defined templates for OpenShift
            fs.readFile(MASTER_INDEX_JSON_FILE, 'utf8', function (err, data) {
                if (err)
                    return reject(err);
        
                const masterjson = JSON.parse(data);

                // Run odo command to get list of catalog components available for cluster
                const odocomponents = [];
                exec(ODO_CATALOG_LIST_COMMAND, (err, stdout) => {
                    if (err)
                        return reject(err);
    
                    stdout.split(os.EOL).forEach((line) => {
                        const splitline = line.trim().split(/\s+/);
                        let componentname = splitline[0];
                        odocomponents.push(componentname);
                    });

                    // Loop through current list of templates in master index.json and delete any language 
                    // not in component list returned by odo command
                    // note: the master index.json is assumed to use same keywords for 'language' as odo uses for component 'name'
                    for(var i = 0; i < masterjson.length; i++) {
                        if ( ! odocomponents.includes(masterjson[i].language) ) {
                            masterjson.splice(i,1);
                        }
                    }

                    // Write out reconciled index.json file
                    const reconciledjsoncontent = JSON.stringify(masterjson, null, 3);
                    fs.writeFile(RECONCILED_INDEX_JSON_FILE, reconciledjsoncontent, 'utf8', function (err) {
                        if (err)
                            return reject(err);
                    }); 
                });
            });
            
            // Return a link to the updated json index file
            const repos = [];
            repos.push({
                description: 'OpenShift Stacks',
                url: JSON_FILE_URL
            });
            resolve(repos);
        });
    } 
}
