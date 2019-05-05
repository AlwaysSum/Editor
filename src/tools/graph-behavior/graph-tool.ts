import { Material, Scene } from 'babylonjs';
import { AbstractEditionTool, Tools } from 'babylonjs-editor';
import { LGraph, LiteGraph, LGraphGroup } from 'litegraph.js';

import { LiteGraphNode } from '../../extensions/behavior/graph-nodes/typings';

export default class GraphNodeTool extends AbstractEditionTool<LiteGraphNode> {
    // Public members
    public divId: string = 'BEHAVIOR-GRAPH-NODE-TOOL';
    public tabName: string = 'Graph Node';

    // Private members
    private _mode: string = '';

    /**
     * Constructor
     * @param editor the path finder editor
     */
    constructor () {
        super();
    }

    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    public isSupported(object: any): boolean {
        return object instanceof LiteGraphNode || (object.graph && object.graph instanceof LGraph);
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(node: LiteGraphNode): void {
        super.update(node);

        // Group?
        if (node instanceof LGraphGroup)
            return this._setupGroup(node);

        // Description
        const ctor = Tools.GetConstructorName(node);
        for (const key in LiteGraph.registered_node_types) {
            if (LiteGraph.registered_node_types[key].name === ctor) {
                const desc = LiteGraph.registered_node_types[key].desc || LiteGraph.registered_node_types[key].Desc;

                this.tool.addFolder(desc);
                break;
            }
        }

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(node, 'title').name('Title');

        const modes: string[] = ['ALWAYS', 'ON_EVENT', 'NEVER', 'ON_TRIGGER'];
        this._mode = modes[node.mode];
        common.add(this, '_mode', modes).name('Mode').onChange(r => {
            node.mode = LiteGraph[r];
            LiteGraphNode.SetColor(node);
        });

        // Properties
        if (Object.keys(node.properties).length === 0) {
            this.tool.addFolder('No properties');
            return;
        }

        const properties = this.tool.addFolder('Properties');
        properties.open();

        const keys = Object.keys(node.properties);

        keys.forEach(k => {
            // Node path?
            if (k === 'nodePath') {
                const scene = <Scene> node.graph.scriptScene;

                const result: string[] = ['self'];
                scene.meshes.forEach(m => result.push(m.name));
                scene.lights.forEach(l => result.push(l.name));
                scene.cameras.forEach(c => result.push(c.name));

                Tools.SortAlphabetically(result);

                return properties.add(node.properties, k, result).name('Target Node').onChange(() => this.update(node));
            }

            // Property path?
            if (k === 'propertyPath') {
                if (node.hasProperty('nodePath')) {
                    const path = <string> node.properties['nodePath'];

                    if (path === 'self')
                        return properties.add(node.properties, k, this._getPropertiesPaths(node)).name(k);

                    const scene = this.editor.core.scene;
                    const target = path === 'Scene' ? scene : scene.getNodeByName(path);

                    return properties.add(node.properties, k, this._getPropertiesPaths(node, '', target)).name(k);
                }
                
                return properties.add(node.properties, k, this._getPropertiesPaths(node)).name(k);
            }

            // Swith type of property
            switch (typeof node.properties[k]) {
                case 'number': properties.add(node.properties, k).step(0.001).name(k); break;
                case 'string': properties.add(node.properties, k).name(k); break;
                case 'boolean': properties.add(node.properties, k).name(k); break;
                default: break;
            }
        });
    }

    // Returns all the available properties
    private _getPropertiesPaths (node: LiteGraphNode, path: string = '', root?: any, rootProperties?: string[]): string[] {
        const result = rootProperties || ['Scene'];
        const object = root || node.graph.scriptObject;

        for (const k in object) {
            const key = path === '' ? k : `${path}.${k}`;

            // Bypass _
            if (k[0] === '_')
                continue;

            // Material?
            if (object[k] instanceof Material) {
                this._getPropertiesPaths(node, key, object[k], result);
                continue;
            }

            // Constructor name
            const ctor = Tools.GetConstructorName(object[k]).toLowerCase();
            switch (ctor) {
                case 'boolean':
                case 'string':
                case 'number': result.push(key); break;
                
                case 'vector2':
                    result.push(key + '.x');
                    result.push(key + '.y');
                    break;
                case 'vector3':
                    result.push(key + '.x');
                    result.push(key + '.y');
                    result.push(key + '.z');
                    break;

                case 'color3':
                    result.push(key + '.r');
                    result.push(key + '.g');
                    result.push(key + '.b');
                    break;
                case 'color4':
                    result.push(key + '.r');
                    result.push(key + '.g');
                    result.push(key + '.b');
                    result.push(key + '.a');
                    break;

                default: break;
            }
        }

        Tools.SortAlphabetically(result);
        return result;
    }

    // Setups the group node
    private _setupGroup (node: any): void {
        this.tool.add(node, 'title').name('Title').onChange(_ => node.graph.setDirtyCanvas(true, true));
        this.tool.addHexColor(node, 'color').onChange(_ => node.graph.setDirtyCanvas(true, true));
    }
}
