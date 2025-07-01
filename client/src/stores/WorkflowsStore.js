import { makeAutoObservable, onBecomeObserved, onBecomeUnobserved } from "mobx";
import { Interview, Interviews, WorkflowModel } from "../../server/types";
import MobxI18n from "../language/MobxI18n";
import { sleep } from "../utils";
import {
  finishDarkIcon,
  handwrittenProcessDarkIcon,
  machineTranslationProcessDarkIcon,
  metadataProcessDarkIcon,
  ocrProcessDarkIcon,
} from "../icons";

export const newWorkflowsStore = () => {
  let isObserved = true;
  let numInvocationsWorkflows = 0;
  let numInvocationsFlowTree = 0;

  const store = makeAutoObservable({
    organizationName: "default_org", //Default but fetching from env variables
    userName: "default_user", //Default but fetching from env variables

    workflows: {} as { [key: number]: WorkflowModel },
    selectedWorkflowId: null as number,

    workflowValidation: false,
    workflowFieldsError: false,
    selectedWorkflowName: null,
    workflowBeingEdited: null,
    selectedFlowMode: "new_flow",

    reactFlowInstance: { current: null },
    reactFlowWrapper: { current: null },
    nodes: [] as any,
    edges: [] as any,

    endNodeExist: false,
    validationPopup: false,
    popupMessage: "",
    mostSevereErrorMessage: "",

    dataFlowTree: {} as Interviews,
    initialTree: {} as Interviews,

    flowModeOptions: {
      ["new_flow"]: { name: "New Flow" },
      ["all_flows"]: { name: "All Flows" },
      // ['hidden_flows']: { name: 'Hidden Flows' },
    },

    get getNodeTypes() {
      return {
        end: {
          type: "end",
          label: "END",
          nifiLabel: "End",
          toolbarButtonTitle: "End",
          toolbarButtonStyleColor: "red",
          icon: finishDarkIcon,
        },
        root: {
          type: "root",
          label: "START",
          nifiLabel: "Start",
          // toolbarButtonTitle: 'Start',
          // toolbarButtonStyleColor: 'red'
        },
        ocr: {
          type: "ocr",
          label: "OCR",
          nifiLabel: "OCR",
          toolbarButtonTitle: "Ocr",
          toolbarButtonStyleColor: "orange",
          icon: ocrProcessDarkIcon,
        },
        ocr_handwritten: {
          type: "ocr_handwritten",
          label: "OCR Handwritten",
          nifiLabel: "OCR_Handwritten",
          toolbarButtonTitle: "Ocr Handwritten",
          toolbarButtonStyleColor: "brown",
          icon: handwrittenProcessDarkIcon,
        },
        text_analysis: {
          type: "text_analysis",
          label: "Text Analysis",
          nifiLabel: "ExpertAI",
          toolbarButtonTitle: "Text Analysis",
          toolbarButtonStyleColor: "purple",
          icon: metadataProcessDarkIcon,
        },
        machine_translation: {
          type: "machine_translation",
          label: "Machine Translation",
          nifiLabel: "Tilde",
          toolbarButtonTitle: "Machine Translation",
          toolbarButtonStyleColor: "blue",
          icon: machineTranslationProcessDarkIcon,
        },
      };
    },

    getNodeColorCB(node: any) {
      const nodeType = node?.type
        ? node.type?.trim()?.toLocaleLowerCase()
        : node.label?.trim()?.toLocaleLowerCase();
      const nodeEndsInterview = node?.data
        ? node?.data?.ends_interview === "T"
        : node?.ends_interview === "T";

      switch (nodeType) {
        case "question":
          return "rgb(255, 30, 22)";
        case "answer":
          if (nodeEndsInterview) return "black";
          return "rgb(3 167 52)";
        case "root":
          return "rgb(46, 148, 27)";
        case "end":
          return "rgb(172, 11, 11)";
        case "ocr":
          return "rgb(232, 153, 62)";
        case "ocr_handwritten":
          return "rgb(141, 75, 5)";
        case "machine_translation":
          return "rgb(22, 84, 209)";
        case "text_analysis":
          return "rgb(136, 70, 164)";
        default:
          return "#ff0072";
      }
    },

    async fetchEnvVariables() {
      await fetch(`api/env`)
        .then((res) => res.json())
        .then((env) => {
          this.organizationName = env.ORG_NAME;
          this.userName = env.USER_NAME;
        })
        .catch((err) => {
          // Catch any possible error to keep retrying
          console.error("Env variables fetch failed", err);
        });
    },

    async fetchWorkflows() {
      if (!isObserved) return;

      numInvocationsWorkflows++;

      await fetch(`/api/admin/workflows/`)
        .then((res) => res.json())
        .then((workflows) => {
          store.storeWorkflows(workflows);
        })
        .catch((err) => {
          // Catch any possible error to keep retrying
          console.error("Workflows list fetch failed", err);
        });

      await sleep(10e3);

      numInvocationsWorkflows--;
      if (numInvocationsWorkflows <= 0) store.fetchWorkflows();
    },

    async postWorkflow(payload: Partial<WorkflowModel>, successCallBack?: any) {
      const res = await fetch("/api/admin/workflows", {
        method: "POST",
        body: JSON.stringify({ workflowModel: payload }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (res.status === 200 && successCallBack) successCallBack();

      return { success: res.status === 200 };
    },

    async editWorkflow(
      workflowModel: Partial<WorkflowModel>,
      successCallBack?: any
    ) {
      const res = await fetch("/api/admin/workflows", {
        method: "PUT",
        body: JSON.stringify({ workflowModel: workflowModel }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (res.status === 200 && successCallBack) successCallBack();

      return { success: res.status === 200 };
    },

    storeWorkflows(objects: WorkflowModel[]) {
      // add new objects
      for (let obj of objects) {
        if (obj.id in store.workflows) {
          if (JSON.stringify(obj) !== JSON.stringify(store.workflows[obj.id])) {
            Object.assign(store.workflows[obj.id], obj);
          }
        } else {
          store.workflows[obj.id] = obj;
        }
      }
      // Delete object that do not exist anymore
      for (let objId of Object.keys(store.workflows)) {
        const i = objects.findIndex((e: WorkflowModel) => e.id === +objId);
        if (i < 0) {
          delete store.workflows[objId];
        }
      }
    },

    async fetchFlowTreeByName(workflowName: string) {
      if (!isObserved) return;

      numInvocationsFlowTree++;

      await fetch(`/api/admin/workflows/flow_tree/${workflowName}`)
        .then((res) => res.json())
        .then((flowTree) => {
          store.storeFlowTree(flowTree);
        })
        .catch((err) => {
          // Catch any possible error to keep retrying
          console.error("Flow Tree fetch failed", err);
        });
      await sleep(10e3);

      numInvocationsFlowTree--;
      if (numInvocationsFlowTree <= 0) store.fetchFlowTreeByName(workflowName);
    },

    async postNewTreeFlow(
      workflowName: string,
      nodes: Interviews,
      deletedNodes: number[],
      successCallBack?: any
    ) {
      const res = await fetch(
        `/api/admin/workflows/flow_tree/${workflowName}`,
        {
          method: "POST",
          body: JSON.stringify({ nodes: nodes, nodeIdsToDelete: deletedNodes }),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (res.status === 200 && successCallBack) successCallBack();

      return { success: res.status === 200 };
    },

    storeFlowTree(objects: any) {
      const data = objects;
      const newObj: typeof this.dataFlowTree = {};
      for (const interview of data) {
        if (interview.children) interview.children.sort((a, b) => a - b);
        newObj[interview.id] = interview;
      }
      this.dataFlowTree = newObj;
    },

    //////////////////////////////////
    ////Workflow to Nifi requests////
    ////////////////////////////////

    async sendWorkflowToNifi(
      treeNodes: Record<string, Interview>,
      workflowModel: WorkflowModel
    ) {
      // const organizationName = departmentsStore.departments[userInfoStore.data.departmentID]?.departmentname;
      // const userName = userInfoStore.data.username;
      const organizationName = this.organizationName;
      const userName = this.userName;

      const resultOrg = await this.createOrg(organizationName);
      const resultUser = await this.createUser(organizationName, userName);
      const resultFlow = await this.createFlow(
        organizationName,
        userName,
        workflowModel.name
      );

      const result = {
        org:
          resultOrg.status !== 200
            ? resultOrg.status === 500
              ? resultOrg.status
              : resultOrg.result?.errors?.[0]?.message
            : MobxI18n.t.has_created,
        user:
          resultUser.status !== 200
            ? resultUser.status === 500
              ? resultUser.status
              : resultUser.result?.errors?.[0]?.message
            : MobxI18n.t.has_created,
        flow:
          resultFlow.status !== 200
            ? resultFlow.status === 500
              ? resultFlow.status
              : resultFlow.result?.errors?.[0]?.message
            : MobxI18n.t.has_created,
      };

      if (
        resultOrg.status === 500 ||
        resultUser.status === 500 ||
        resultFlow.status === 500
      ) {
        return { success: false, result: result };
      }

      let resultNode = [];
      for (let node of Object.values(treeNodes)) {
        //create nodes
        let sourceName = node.type.trim().toLocaleLowerCase();

        if (this.getNodeTypes[sourceName])
          sourceName = this.getNodeTypes[sourceName]?.nifiLabel;
        resultNode.push(
          await this.createNode(
            organizationName,
            userName,
            workflowModel.name,
            sourceName
          )
        );
      }

      for (let node of Object.values(treeNodes)) {
        //create edges
        let sourceName = node.type.trim().toLocaleLowerCase();
        let destinationName = node?.children;

        if (this.getNodeTypes[sourceName])
          sourceName = this.getNodeTypes[sourceName]?.nifiLabel;

        if (destinationName.length > 0) {
          destinationName.map(async (childId) => {
            let dstName = treeNodes[childId]?.type?.trim()?.toLocaleLowerCase();

            if (this.getNodeTypes[dstName])
              dstName = this.getNodeTypes[dstName]?.nifiLabel;

            resultNode.push(
              await this.createEdge(
                organizationName,
                userName,
                workflowModel.name,
                sourceName,
                dstName
              )
            );
          });
        }
      }

      //Return errors
      // if (resultOrg.status === 200 && resultUser.status === 200 && resultFlow.status === 200) {
      //     console.log('Correct Flow');
      //     return { success: true };
      // } else {
      //     return { success: false, result: result };
      // }

      return { success: true };
    },

    async createOrg(organizationName: string) {
      const res = await fetch("/api/admin/workflows/organization_new", {
        method: "POST",
        body: JSON.stringify({
          organizationName: organizationName,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (res.status === 500)
        return { status: res.status, result: await res.text() };
      else return { status: res.status, result: await res.json() };
    },

    async createUser(organizationName: string, userName: string) {
      const res = await fetch("/api/admin/workflows/user_new", {
        method: "POST",
        body: JSON.stringify({
          organizationName: organizationName,
          userName: userName,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (res.status === 500)
        return { status: res.status, result: await res.text() };
      else return { status: res.status, result: await res.json() };
    },

    async createFlow(
      organizationName: string,
      userName: string,
      flowName: string
    ) {
      const res = await fetch("/api/admin/workflows/flow_new", {
        method: "POST",
        body: JSON.stringify({
          organizationName: organizationName,
          userName: userName,
          flowName: flowName,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (res.status === 500)
        return { status: res.status, result: await res.text() };
      else return { status: res.status, result: await res.json() };
    },

    async createNode(
      organizationName: string,
      userName: string,
      flowName: string,
      sourceFlowName: string
    ) {
      const res = await fetch("/api/admin/workflows/flow/copy-simplified", {
        method: "POST",
        body: JSON.stringify({
          organizationName: organizationName,
          userName: userName,
          flowName: flowName,
          sourceFlowName: sourceFlowName,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (res.status === 500)
        return { status: res.status, result: await res.text() };
      else return { status: res.status, result: await res.json() };
    },

    async createEdge(
      organizationName: string,
      userName: string,
      flowName: string,
      sourceName: string,
      destinationName: string
    ) {
      const res = await fetch("/api/admin/workflows/connection/simplified", {
        method: "POST",
        body: JSON.stringify({
          organizationName: organizationName,
          userName: userName,
          flowName: flowName,
          sourceName: sourceName,
          destinationName: destinationName,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (res.status === 500)
        return { status: res.status, result: await res.text() };
      else return { status: res.status, result: await res.json() };
    },

    async sendFile(
      body: any,
      userName: string,
      flowName: string
    ) {
      // Accept FormData for file upload
      const organizationName = this.organizationName;
      console.log("Implement Send File to Flow");
      const res = await fetch(
        `/api/admin/workflows/flow/data/file/${organizationName}/${userName}/${flowName}`,
        {
          method: "POST",
          body: body, // body is FormData
          // Do NOT set Content-Type header for FormData, browser will set it
        }
      );

      return { status: res.status, result: await res.json() };
    },

    async flowEnable(
      organizationName: string,
      userName: string,
      flowName: string
    ) {
      const res = await fetch(
        `/api/admin/workflows/flow/controller-services-simplified/${organizationName}/${userName}/${flowName}`,
        {
          method: "PUT",
          body: JSON.stringify({ state: "ENABLED" }),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (res.status === 500)
        return { status: res.status, result: await res.text() };
      else return { status: res.status, result: await res.json() };
    },

    async flowRunning(
      organizationName: string,
      userName: string,
      flowName: string
    ) {
      const res = await fetch(
        `/api/admin/workflows/flow/run-status-simplified/${organizationName}/${userName}/${flowName}`,
        {
          method: "PUT",
          body: JSON.stringify({ state: "RUNNING" }),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (res.status === 500)
        return { status: res.status, result: await res.text() };
      else return { status: res.status, result: await res.json() };
    },

    clearWorkFlowValues() {
      this.endNodeExist = false;
    },

    checkUniqueNodes(nodes: any, currentNode: any) {
      const nodeId = currentNode?.id;
      const nodeType = currentNode?.type;

      if (this.endNodeExist) {
        const findNode = Object.values(nodes)?.find(
          (v: any) => v.id !== nodeId && v.type === nodeType
        );

        if (nodeType?.trim()?.toLocaleLowerCase() === "end") {
          if (!findNode) this.endNodeExist = false;
        }
      }
    },
  });

  onBecomeObserved(store, "workflows", () => {
    isObserved = true;
    store.fetchEnvVariables();
    store.fetchWorkflows();
  });
  onBecomeUnobserved(store, "workflows", () => {
    isObserved = false;
  });

  return store;
};

export type WorkflowsStore = ReturnType<typeof newWorkflowsStore>;

export const hardCodedOutputOCR = `[{"extracted_text":"Jane Doe 123 Main Street Best town, CA 12345 ( 123)456-7890 jane. doe@ email. com Product Manager Acme Corporation"}]`;
export const hardCodedOutputMachineTranslation = `[{"domain":"GENERAL","translations":[{"translation":"Jane Doe 123 rue principale meilleure ville, CA 12345 (123) 456-7890 Jane. Doe @ email. com Gestionnaire de produits Acme Corporation"}],"detectedLanguage":null}]`;
export const hardCodedOutputTextAnalysis = `[ {
  "RESPONSE" : {
    "DOCUMENT" : "Jane Doe 123 rue principale meilleure ville, CA 12345 (123) 456-7890 Jane. Doe @ email. com Gestionnaire de produits Acme Corporation\n",
    "CATEGORIZATION" : [ {
      "FEATURE" : "INTELLIGENCE",
      "DOMAIN" : [ {
        "FREQUENCY" : 46.02,
        "SCORE" : 2430,
        "NAME" : "/Intelligence Taxonomy/Health/Medicine",
        "RULE" : {
          "SCORE" : 2430,
          "END" : 73,
          "BEGIN" : 0,
          "OPERAND" : {
            "END" : 7,
            "BEGIN" : 0
          }
        }
      }, {
        "FREQUENCY" : 45.45,
        "SCORE" : 2400,
        "NAME" : "/Intelligence Taxonomy/Health/Medicine/Illicit drugs and controlled substances",
        "RULE" : [ {
          "SCORE" : 1200,
          "END" : 73,
          "BEGIN" : 0,
          "OPERAND" : {
            "END" : 7,
            "BEGIN" : 0
          }
        }, {
          "SCORE" : 1200,
          "END" : 73,
          "BEGIN" : 0,
          "OPERAND" : {
            "END" : 7,
            "BEGIN" : 0
          }
        } ]
      } ]
    }, {
      "FEATURE" : "CRIME",
      "DOMAIN" : [ ]
    }, {
      "FEATURE" : "TERRORISM",
      "DOMAIN" : [ ]
    }, {
      "FEATURE" : "GEOGRAPHY",
      "DOMAIN" : [ {
        "FREQUENCY" : 0.41,
        "SCORE" : 20,
        "NAME" : "/Geo Taxonomy/United States of America/California",
        "RULE" : [ {
          "SCORE" : 10,
          "END" : 73,
          "BEGIN" : 0,
          "OPERAND" : {
            "END" : 46,
            "BEGIN" : 45
          }
        }, {
          "SCORE" : 10,
          "END" : 73,
          "BEGIN" : 0,
          "OPERAND" : {
            "END" : 46,
            "BEGIN" : 45
          }
        } ]
      }, {
        "FREQUENCY" : 0.41,
        "SCORE" : 20,
        "NAME" : "/Geo Taxonomy/United States of America",
        "RULE" : [ {
          "SCORE" : 10,
          "END" : 73,
          "BEGIN" : 0,
          "OPERAND" : {
            "END" : 46,
            "BEGIN" : 45
          }
        }, {
          "SCORE" : 10,
          "END" : 73,
          "BEGIN" : 0,
          "OPERAND" : {
            "END" : 46,
            "BEGIN" : 45
          }
        } ]
      } ]
    }, {
      "FEATURE" : "CYBERCRIME",
      "DOMAIN" : [ ]
    }, {
      "FEATURE" : "EMOTIONS",
      "DOMAIN" : [ ]
    } ],
    "PEOPLE" : {
      "FEATURE" : "LIST",
      "PERSON" : {
        "BASE" : "Jane",
        "TRACKS" : {
          "TRACK" : {
            "BEGIN" : 69,
            "END" : 72
          }
        },
        "FEATURE" : "FULLNAME",
        "FIELD" : [ {
          "BASE" : 1,
          "NAME" : "ID"
        }, {
          "BASE" : "F",
          "NAME" : "SEX"
        }, {
          "BASE" : "Jane",
          "NAME" : "NAME"
        }, {
          "BASE" : "person generic",
          "NAME" : "humanrole"
        } ]
      }
    },
    "ORGANIZATIONS" : {
      "FEATURE" : "LIST",
      "ORGANIZATION" : {
        "BASE" : "Gestionnaire de produits Acme Corporation",
        "TRACKS" : {
          "TRACK" : {
            "BEGIN" : 92,
            "END" : 132
          }
        },
        "FEATURE" : "FULLNAME",
        "FIELD" : [ {
          "BASE" : 2,
          "NAME" : "ID"
        }, {
          "BASE" : "corporation",
          "NAME" : "comrole"
        } ]
      }
    },
    "PLACES" : {
      "FEATURE" : "LIST",
      "PLACE" : {
        "BASE" : "California",
        "TRACKS" : {
          "TRACK" : {
            "BEGIN" : 45,
            "END" : 46
          }
        },
        "FEATURE" : "FULLNAME",
        "FIELD" : [ {
          "BASE" : 3,
          "NAME" : "ID"
        }, {
          "BASE" : "CA",
          "NAME" : "ALIAS"
        }, {
          "BASE" : 5332921,
          "NAME" : "GeonamesId"
        } ],
        "SYNCON" : {
          "GLOSS" : "federated state in United States of America (North America)"
        },
        "LINKED_SYNCONS" : {
          "COUNT" : 1,
          "LINKED_SYNCON" : {
            "NAME" : "Is a",
            "SYNCON" : {
              "TYPE" : "Noun",
              "LEMMA" : {
                "TEXT" : "federated state"
              }
            }
          }
        },
        "PROP" : [ {
          "COUNTRY" : "United States of America"
        }, {
          "CONTINENT" : "North America"
        }, {
          "COORD" : "37.0/-120.0"
        } ]
      }
    },
    "TEXTMINING" : [ {
      "FEATURE" : "DOM_SPECIFIC",
      "ENTITY" : [ {
        "BASE" : "jane doe",
        "TRACKS" : {
          "TRACK" : {
            "BEGIN" : 0,
            "END" : 7
          }
        },
        "TYPE" : "Controlled Substances",
        "REASONING" : {
          "VALUE" : "drug",
          "ATTRIBUTE" : "Is a"
        },
        "GLOSS" : ""
      }, {
        "BASE" : "(123)4567890",
        "TRACKS" : {
          "TRACK" : {
            "BEGIN" : 54,
            "END" : 67
          }
        },
        "TYPE" : "Phone Numbers"
      } ]
    }, {
      "FEATURE" : "PLACES_REASONING",
      "ENTITY" : {
        "BASE" : "California",
        "TRACKS" : {
          "TRACK" : {
            "BEGIN" : 45,
            "END" : 46
          }
        },
        "TYPE" : "PLACES",
        "REASONING" : {
          "VALUE" : "United States of America",
          "ATTRIBUTE" : "Country"
        }
      }
    }, {
      "FEATURE" : "INFERENTIAL_ENTITIES",
      "ENTITY" : {
        "BASE" : "United States of America",
        "EVIDENCE" : {
          "ATTRIBUTE" : "Country",
          "CUE" : "California",
          "TRACKS" : {
            "TRACK" : {
              "BEGIN" : 45,
              "END" : 46
            }
          }
        }
      }
    }, {
      "FEATURE" : "ENTITIESRELATIONS",
      "NODES" : {
        "NODE" : [ ]
      },
      "RELATIONS" : {
        "REL" : [ ]
      }
    } ],
    "TAGGING" : [ {
      "FEATURE" : "MAINSENTENCES",
      "RELEVANT" : [ {
        "SENTENCE_TEXT" : "Jane Doe 123 rue principale meilleure ville, CA 12345 (123) 456-7890 Jane.",
        "SCORE" : 10.8,
        "TRACKS" : {
          "TRACK" : {
            "BEGIN" : 0,
            "END" : 73
          }
        }
      }, {
        "SENTENCE_TEXT" : "Doe @ email. com Gestionnaire de produits Acme Corporation",
        "SCORE" : 89.1,
        "TRACKS" : {
          "TRACK" : {
            "BEGIN" : 75,
            "END" : 132
          }
        }
      } ]
    }, {
      "FEATURE" : "MAINELEMENTS",
      "LEMMA" : [ {
        "LABEL" : "email",
        "SCORE" : 26.9,
        "TYPE" : "syncon",
        "TRACK" : {
          "BEGIN" : 81,
          "END" : 85
        }
      }, {
        "LABEL" : ".com",
        "SCORE" : 19.6,
        "TYPE" : "syncon",
        "TRACK" : {
          "BEGIN" : 88,
          "END" : 90
        }
      }, {
        "LABEL" : "doe",
        "SCORE" : 16.9,
        "TYPE" : "syncon",
        "TRACK" : {
          "BEGIN" : 75,
          "END" : 77
        }
      }, {
        "LABEL" : "rue",
        "SCORE" : 3.6,
        "TYPE" : "syncon",
        "TRACK" : {
          "BEGIN" : 13,
          "END" : 15
        }
      }, {
        "LABEL" : "Gestionnaire de produits Acme Corporation",
        "SCORE" : 26.9,
        "TYPE" : "lemma",
        "TRACK" : {
          "BEGIN" : 92,
          "END" : 132
        }
      }, {
        "LABEL" : "com",
        "SCORE" : 20.0,
        "TYPE" : "lemma",
        "TRACK" : {
          "BEGIN" : 88,
          "END" : 90
        }
      }, {
        "LABEL" : "jane doe",
        "SCORE" : 3.6,
        "TYPE" : "lemma",
        "TRACK" : {
          "BEGIN" : 0,
          "END" : 7
        }
      }, {
        "LABEL" : "Jane",
        "SCORE" : 3.3,
        "TYPE" : "lemma",
        "TRACK" : {
          "BEGIN" : 69,
          "END" : 72
        }
      }, {
        "LABEL" : "com Gestionnaire de produits Acme Corporation",
        "SCORE" : 92.4,
        "TYPE" : "group",
        "TRACK" : {
          "BEGIN" : 88,
          "END" : 132
        }
      }, {
        "LABEL" : "meilleure ville",
        "SCORE" : 6.6,
        "TYPE" : "group",
        "TRACK" : {
          "BEGIN" : 28,
          "END" : 42
        }
      }, {
        "LABEL" : "rue principale meilleure ville",
        "SCORE" : 0.6,
        "TYPE" : "group",
        "TRACK" : {
          "BEGIN" : 13,
          "END" : 42
        }
      }, {
        "LABEL" : "principale meilleure ville",
        "SCORE" : 0.2,
        "TYPE" : "group",
        "TRACK" : {
          "BEGIN" : 17,
          "END" : 42
        }
      } ]
    } ],
    "FACTMINING" : [ {
      "FEATURE" : "INTELLIGENCE",
      "DOMAIN" : [ ]
    }, {
      "FEATURE" : "CRIME",
      "DOMAIN" : [ ]
    }, {
      "FEATURE" : "TERRORISM",
      "DOMAIN" : [ ]
    }, {
      "FEATURE" : "GEOGRAPHY",
      "DOMAIN" : {
        "NAME" : "/Geo Taxonomy/United States of America",
        "PROP" : [ {
          "CONTINENT" : "North America"
        }, {
          "COORD" : "39.759724/-98.5"
        } ],
        "RULE" : {
          "END" : 73,
          "BEGIN" : 0,
          "OPERAND" : {
            "END" : 46,
            "BEGIN" : 45,
            "NAME" : "CA"
          },
          "TOPIC" : {
            "NAME" : "California"
          },
          "ENTITY" : [ {
            "END" : 7,
            "BEGIN" : 0,
            "NAME" : "jane doe",
            "TYPE" : "Controlled Substances"
          }, {
            "ID" : "0003",
            "COORD" : "37.0/-120.0",
            "END" : 46,
            "BEGIN" : 45,
            "NAME" : "California",
            "TYPE" : "PLACES"
          }, {
            "END" : 67,
            "BEGIN" : 54,
            "NAME" : "(123)4567890",
            "TYPE" : "Phone Numbers"
          }, {
            "ID" : "0001",
            "END" : 72,
            "BEGIN" : 69,
            "NAME" : "Jane",
            "TYPE" : "PEOPLE"
          } ]
        }
      }
    }, {
      "FEATURE" : "CYBERCRIME",
      "DOMAIN" : [ ]
    }, {
      "FEATURE" : "EMOTIONS",
      "DOMAIN" : [ ]
    } ],
    "WRITEPRINT" : {
      "FEATURE" : "INDEXES",
      "READABILITY_INDEX" : {
        "GRADE_LEVEL" : 3,
        "EVALUATION" : "HIGH",
        "VALUE" : 100.0
      },
      "STYLE_INDEXES" : {
        "SEMANTIC_INDEXES" : {
          "DOCUMENT_STRUCTURE" : {
            "INDEX" : [ {
              "VALUE" : 2.0,
              "VALUE_TYPE" : "ABSOLUTE",
              "NAME" : "N_SENT"
            }, {
              "VALUE" : 66.0,
              "VALUE_TYPE" : "MEAN",
              "NAME" : "CHAR_PER_SENT"
            }, {
              "VALUE" : 9.0,
              "VALUE_TYPE" : "MEAN",
              "NAME" : "WORD_PER_SENT"
            } ]
          },
          "VOCABULARY_RICHNESS" : {
            "INDEX" : [ {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "ABSOLUTE",
              "NAME" : "SEMANTIC_RICHNESS"
            }, {
              "VALUE" : 100.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "DIFFERENT_LEMMA"
            }, {
              "VALUE" : 38.46,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "SHORT_WORD"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "HIGH_FREQ"
            }, {
              "VALUE" : 20.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "ADVANCED_WORD"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "ACADEMIC_WORD"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "COMMON_WORD"
            } ]
          },
          "GRAMMAR" : {
            "INDEX" : [ {
              "VALUE" : 50.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "WORD_NOU"
            }, {
              "VALUE" : 5.56,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "WORD_ADJ"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "WORD_VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "WORD_CON"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "WORD_ADV"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_CONDITIONAL"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_ED_FORM"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_FUTURE"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_ING_FORM"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_PAST_PERFECT"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_PRESENT_PERFECT"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_SIMPLE_PAST"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_SIMPLE_PRESENT"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "TENSE_UNDEFINED"
            } ]
          },
          "REGISTER" : {
            "INDEX" : [ {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "REGISTER_ABBREVIATION"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "REGISTER_FOREIGN"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "REGISTER_LITERARY"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "REGISTER_SLANG"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "CUSTOM_REGISTER_CRIMINAL_ENTERPRISE_SLANG"
            }, {
              "VALUE" : 5.56,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "CUSTOM_REGISTER_CYBER_ILLEGAL_SLANG"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "CUSTOM_REGISTER_MILITARY_SLANG"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "CUSTOM_REGISTER_SOCIAL_SLANG"
            } ]
          },
          "CHAINS" : {
            "CHAIN-INDEX" : [ {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "ABOUT_NATURAL_EVENTS",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "CORRECT_EXCHANGE_OF_GOODS",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "ILLEGAL_EXCHANGE_OF_GOODS",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "INCORRECT_EXCHANGE_OF_GOODS",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "LEGAL_EXCHANGE_OF_GOODS",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_ASSAILMENT",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_DISSENT",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_DRUGS_USE",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_ECONOMY",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_EXISTENCE",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_FINANCES",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_FIRING_A_WEAPON",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_GENERAL_MOVEMENT",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_GENERIC_COMMUNICATION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_INDUSTRIAL_CREATION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_INDUSTRIAL_PROFESSION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_INDUSTRY",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_INFORMATICS_PROFESSION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_INVESTIGATION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_LAW",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_LINGUISTIC_COMMUNICATION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_MILITARY_ACTION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_MOVEMENT",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_MOVEMENT_ON_PLACE",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_NO_LINGUISTIC_COMMUNICATION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_POLITICS",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_POSSESSION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_PSYCHOLOGICAL_ACTION",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_SHIFT_OF_PLACE",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_SOCIAL_BEHAVIOUR",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_TAKING",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_TRADE",
              "TYPE" : "VER"
            }, {
              "VALUE" : 0.0,
              "VALUE_TYPE" : "PERCENT",
              "NAME" : "OF_TRAVEL",
              "TYPE" : "VER"
            } ]
          }
        }
      }
    }
  }
} ]`;