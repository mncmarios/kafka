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
    selectedWorkflowId: null as unknown as number,

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
        resultNode
          .push
          //   await this.createNode(
          //     organizationName,
          //     userName,
          //     workflowModel.name,
          //     sourceName
          //   )
          ();
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

            // resultNode.push(
            //   await this.createEdge(
            //     organizationName,
            //     userName,
            //     workflowModel.name,
            //     sourceName,
            //     dstName
            //   )
            // );
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

    async sendFile(body: any, userName: string, flowName: string) {
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
