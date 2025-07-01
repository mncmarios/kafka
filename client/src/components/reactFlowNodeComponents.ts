import {
  ChangeEventHandler,
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Handle, NodeProps, Position, useUpdateNodeInternals } from "reactflow";
import {
  cameraLayout10Icon,
  connectorDarkIcon,
  connectorLightIcon,
  finishDarkIcon,
  multipleChoiceIcon,
  playLightIcon,
  typeTextIcon,
} from "../../icons";
import {
  getIncidentTypeAreaModel,
  settingsBlack,
  settingsWhite,
} from "../../utils";
import { Portal } from "../Portal";
import { StyledButton } from "../StyledButton";
import MobxI18n from "../../language";
import "./react-flow-node-components.css";
import { observer } from "mobx-react-lite";
import { ResizableDraggableDialog } from "../ResizableDraggableDialog/ResizableDraggableDialog";
import { themeStore, userInfoStore, workflowsStore } from "../../stores";
import { Switch } from "../Switch";
import {
  hardCodedOutputTextAnalysis,
  hardCodedOutputOCR,
  hardCodedOutputMachineTranslation,
} from "../../stores/WorkFlowsStore";
import { AgencyIncidentTypeAreaModel } from "../../../server/types";
import { agenciesStore } from "../../stores/AgenciesStore";
import { useValuesBetweenInterval } from "../../utils/hooks/useValuesBetweenInterval";
import { IncidentTypesViewGeneric } from "../administration/AllIncidentsTypeViewGeneric";
import { SelectedIncidentTypes } from "../SelectedIncidentTypes";
import { AnswerType } from "./reactFlowUtils";
import { departmentsStore } from "../../stores/DepartmentsStore";

// Root Node
export const ReactFlowRootComponent: FC<
  NodeProps & {
    updateNodeData?: (nodeId: string, key: string, value: any) => void;
  }
> = observer(function ReactFlowRootComponent({ updateNodeData, ...props }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(props.id);
  }, [props.data.ends_interview, updateNodeInternals]);

  // Use MobX action to update node data globally for reactivity
  const updateKey = (key: string, v: any) => {
    if (updateNodeData) {
      updateNodeData(props.id, key, v);
    }
  };

  return (
    <div
      className="react-flow__node-input react-flow-root-node"
      style={{
        background: workflowsStore.getNodeColorCB(props.data),
        height: "100%",
      }}
    >
      <div>
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ left: "50%", borderRadius: 50 }}
        />
      </div>

      <div>
        <div
          style={{
            display: "inline-flex",
            position: "absolute",
            top: "2px",
            right: "0px",
          }}
        >
          <StyledButton
            buttonSize="22"
            type="black"
            onClick={() => {
              setIsSettingsOpen((p) => !p);
            }}
            icon={connectorLightIcon}
          />
        </div>
      </div>

      <div>
        <StyledButton
          buttonSize="22"
          type="black"
          icon={playLightIcon}
          disabled={
            !workflowsStore.workflowValidation ||
            !workflowsStore.workflowFieldsError
          }
          onClick={() => {
            // const organizationName = departmentsStore.departments[userInfoStore.data.departmentID]?.departmentname;
            // const userName = userInfoStore.data.username;
            const organizationName = workflowsStore.organizationName;
            const userName = workflowsStore.userName;

            workflowsStore.flowEnable(
              organizationName,
              userName,
              props.data.additional_data.workflowName
            );
            workflowsStore.flowRunning(
              organizationName,
              userName,
              props.data.additional_data.workflowName
            );
          }}
        />

        {/* <input
                    onChange={(e) => { updateKey('inputData', e.currentTarget.value === 'None' ? null : e.currentTarget.value); console.log(props) }}
                    value={props.data.inputData || ''}
                /> */}
      </div>

      {isSettingsOpen && (
        <Portal portalRoot={document.getElementById("flex-app")}>
          <ResizableDraggableDialog
            defaultWidth={500}
            defaultHeight={400}
            headerIconSrc={themeStore.dark ? settingsWhite : settingsBlack}
            headerText={MobxI18n.t.settings}
            onCloseButton={() => setIsSettingsOpen(false)}
          >
            <InputDataNodeSettings
              {...props}
              closeRnd={() => setIsSettingsOpen(false)}
              updateKey={updateKey}
            />
          </ResizableDraggableDialog>
        </Portal>
      )}
    </div>
  );
});

// End Node
export const ReactFlowEndNodeComponent: FC<NodeProps> = observer(
  function ReactFlowEndNodeComponent(props) {
    return (
      <ReactFlowEndContainer {...props}>
        <ReactFlowEndNodeComponentInner {...props} />
      </ReactFlowEndContainer>
    );
  }
);

const ReactFlowEndContainer: FC<NodeProps> = (props) => {
  return (
    <div
      style={{
        background: workflowsStore.getNodeColorCB(props),
        borderRadius: ".5em",
        padding: ".5em",
        color: "white",
      }}
    >
      {props.children}
    </div>
  );
};

export const ReactFlowEndNodeComponentInner: FC<NodeProps> = (props) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minWidth: "70px",
        minHeight: "50px",
      }}
    >
      <div>
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ left: "50%", borderRadius: 50 }}
        />
      </div>

      <div style={{ textAlign: "center", alignItems: "center" }}>
        <img src={finishDarkIcon}></img>
      </div>
    </div>
  );
};

// Process Node
export const ReactFlowProcessNodeComponent: FC<NodeProps> = observer(
  function ReactFlowProcessNodeComponent(props) {
    return (
      <ReactFlowProcessAnimateContainer {...props}>
        <ReactFlowProcessNodeComponentInner {...props} />
      </ReactFlowProcessAnimateContainer>
    );
  }
);

const ReactFlowProcessAnimateContainer: FC<NodeProps> = (props) => {
  return (
    <div
      style={{
        background: workflowsStore.getNodeColorCB(props),
        borderRadius: ".5em",
        padding: ".5em",
        color: "white",
      }}
    >
      {props.children}
    </div>
  );
};

const ReactFlowProcessNodeComponentInner: FC<NodeProps> = (props) => {
  let hardCodedOutput = "NO_DATA";
  if (props.type.toLocaleLowerCase() === "ocr") {
    hardCodedOutput = hardCodedOutputOCR;
  } else if (props.type.toLocaleLowerCase() === "ocr_handwritten") {
    hardCodedOutput = hardCodedOutputOCR;
  } else if (props.type.toLocaleLowerCase() === "machine_translation") {
    hardCodedOutput = hardCodedOutputMachineTranslation;
  } else if (props.type.toLocaleLowerCase() === "text_analysis") {
    hardCodedOutput = hardCodedOutputTextAnalysis;
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div>
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ left: "50%", borderRadius: 50 }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ left: "50%", borderRadius: 50 }}
        />
      </div>

      <div>
        <img
          height={"20px"}
          width={"25px"}
          style={{
            position: "relative",
            top: "2px",
          }}
          src={workflowsStore.getNodeTypes[props.type.toLocaleLowerCase()].icon}
        ></img>

        <div style={{ textAlign: "center" }}>
          <span>
            {workflowsStore.getNodeTypes[props.type.toLocaleLowerCase()]
              .label || props.data.label}
          </span>
        </div>

        <div style={{ display: "grid", padding: "0.5em" }}>
          <div>
            <span style={{ fontSize: "0.7em" }}>{"OUTPUT"}</span>
          </div>
          <textarea
            style={{ backgroundColor: "black" }}
            disabled
            onChange={() => {}}
            value={hardCodedOutput || props?.data?.outputData || ""}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
};

// Input Data Node Settings
const InputDataNodeSettings: FC<
  NodeProps & { closeRnd: () => void; updateKey: any }
> = observer(({ closeRnd, updateKey, ...props }) => {
  const [textMode, setTextMode] = useState(true);

  const escFunction = useCallback(
    (event) => {
      if (event.keyCode === 27) {
        //Do whatever when esc is pressed
        closeRnd();
      }
    },
    [closeRnd]
  );

  useEffect(() => {
    document.addEventListener("keydown", escFunction, false);

    return () => {
      document.removeEventListener("keydown", escFunction, false);
    };
  });

  const onFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const organizationName =
        departmentsStore.departments[userInfoStore.data.departmentID]
          ?.departmentname;
      const userName = userInfoStore.data.username;

      const formData = new FormData();
      formData.append("file", file);

      console.log(props.data);

      const result = await workflowsStore.sendFile(
        formData,
        organizationName,
        userName
      );

      const url = URL.createObjectURL(file);
      updateKey("inputData", { data: url, type: file.type });

      let outputData = result.result;
      if (typeof outputData === "string") {
        try {
          outputData = JSON.parse(outputData);
        } catch (e) {}
      }

      updateKey("outputData", outputData);
    }

    event.target.value = null;
  };

  const inputModeOptions = {
    ["Text"]: { name: MobxI18n.t.text },
    ["File"]: { name: MobxI18n.t.file },
  };

  return (
    <div
      style={{
        background: "#0d131f",
        border: "1px solid green",
        padding: "1em",
        textAlign: "center",
        alignItems: "center",
      }}
    >
      <div style={{ paddingBottom: "1em" }}>
        <Switch
          options={inputModeOptions}
          selected={textMode ? "Text" : "File"}
          onChange={() => {
            setTextMode(!textMode);
          }}
        />
      </div>

      <div style={{ paddingBottom: "1em" }}>
        <span className="labels">
          {MobxI18n.t.node}: {props.id}
        </span>
      </div>

      <div
        style={{
          justifyContent: "center",
          display: "grid",
          gap: ".5em",
          padding: "1em",
        }}
      >
        {(textMode && (
          <>
            <textarea
              style={{
                maxWidth: "400px",
                minWidth: "400px",
                minHeight: "200px",
              }}
              value={props.data.inputData?.data || ""}
              onChange={(e) => {
                updateKey("inputData", { data: e.target.value, type: "text" });
              }}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={MobxI18n.t.type_here_text}
            />
          </>
        )) || (
          <>
            <input
              type="file"
              accept="video/* audio/* image/*"
              onChange={onFileChange}
            />
            {(props.data.inputData?.data &&
              props.data.inputData?.type?.includes("video/") && (
                <>
                  <video width="320" height="240" controls>
                    <source src={props.data.inputData?.data} type="video/mp4" />
                  </video>
                </>
              )) ||
              (props.data.inputData?.type?.includes("audio/") && (
                <>
                  <audio controls src={props.data.inputData?.data}></audio>
                </>
              )) ||
              (props.data.inputData?.type?.includes("image/") && (
                <>
                  <img
                    width={"320px"}
                    height={"240px"}
                    src={props.data.inputData?.data}
                  ></img>
                </>
              ))}
          </>
        )}
      </div>
    </div>
  );
});

const LabelInputField: FC<
  NodeProps & { disabled?: boolean; labelKey?: string }
> = ({ labelKey = "label", ...props }) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const savedPosition = useRef<number>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const onChange: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    props.data[labelKey] = e.currentTarget.value;
    savedPosition.current = e.currentTarget.selectionEnd;
    updateNodeInternals(props.id);
  };

  const value = (() => {
    if (props.disabled) {
      if (labelKey === "newLabel") return "---";
      else if (labelKey === "label") return FREE_ANSWER_DISPLAY_TEXT;
    } else {
      return props.data[labelKey] || "";
    }
  })();

  useLayoutEffect(() => {
    if (!textAreaRef.current) return;
    textAreaRef.current.selectionEnd = savedPosition.current;
  }, [value, savedPosition.current]);

  return (
    <div style={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
      <textarea
        value={value}
        onChange={onChange}
        onKeyDown={(e) => e.stopPropagation()}
        ref={textAreaRef}
        style={{
          background: props.disabled ? "grey" : "white",
          color: "black",
          width: "100%",
          paddingRight: "1em",
        }}
        disabled={props.disabled ?? false}
        placeholder={
          props.type === "question"
            ? FIXED_QUESTION_PLACEHOLDER
            : FIXED_ANSWER_PLACEHOLDER
        }
      />
    </div>
  );
};

const FIXED_QUESTION_PLACEHOLDER = "Type Question here...";
const FIXED_ANSWER_PLACEHOLDER = "Type answer here....";
const FREE_ANSWER_DISPLAY_TEXT = "Typed by Calltaker";

// Question Node
export const ReactFlowQuestionNodeComponent: FC<NodeProps> = observer(
  function ReactFlowQuestionNodeComponent(props) {
    return (
      <ReactFlowQuestionAnimateContainer {...props}>
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ left: "50%", borderRadius: 50 }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ left: "50%", borderRadius: 50 }}
        />
        <div>{props.data.label}</div>
      </ReactFlowQuestionAnimateContainer>
    );
  }
);

const ReactFlowQuestionAnimateContainer: FC<NodeProps> = (props) => {
  const shouldAnimate = props.data?.animate;
  const baseColourClass = "react-flow-question-node-bg-1";
  const bg = useValuesBetweenInterval({
    ms: 700,
    valueA: baseColourClass,
    valueB: "react-flow-question-node-bg-2",
    disabled: !shouldAnimate,
  });
  return (
    <div
      className={`react-flow-shared-styles react-flow__node-default react-flow-question-node ${
        shouldAnimate ? bg : baseColourClass
      }`}
      style={
        props.data.ends_interview === "T"
          ? { background: "black", color: "white" }
          : {}
      }
    >
      {props.children}
    </div>
  );
};

export const ReactFlowInputQuestionNodeComponent: FC<NodeProps> = (props) => {
  const updateNodeInternals = useUpdateNodeInternals();

  const updateKey = (key: string, v: any) => {
    props.data[key] = v;
    /*
          https://reactflow.dev/docs/api/nodes/handle/
          If you are programmatically changing the position or number of handles
          in your custom node, you need to update the node internals with the
          useUpdateNodeInternals hook.
        */
    updateNodeInternals(props.id);
  };

  const columns = useMemo(() => {
    return [
      "description",
      "location_description",
      "caller_fullname",
      "caller_number",
      "priority",
      "building_type",
      "number_of_floors",
      "victims_num",
      "victims_trapped",
      "patient_trauma",
      "patient_condition",
    ];
  }, []);

  return (
    <ReactFlowQuestionAnimateContainer {...props}>
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ left: "50%", borderRadius: 50 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ left: "50%", borderRadius: 50 }}
      />
      <section
        style={{ display: "flex", flexDirection: "column", gap: ".3em" }}
      >
        <span style={{ fontWeight: 600 }}>{MobxI18n.t.question}</span>
        <LabelInputField {...props} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "max-content auto",
            gap: "0.3em",
            alignItems: "center",
            width: "100%",
          }}
        >
          <span>{MobxI18n.t.property}:</span>
          <select
            style={{ width: "100%" }}
            value={props.data.maps_to_col || "None"}
            onChange={(e) =>
              updateKey(
                "maps_to_col",
                e.currentTarget.value === "None" ? null : e.currentTarget.value
              )
            }
          >
            <option value={"None"}>{MobxI18n.t.none}</option>
            {columns.map((v) => (
              <option value={v} key={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </section>
    </ReactFlowQuestionAnimateContainer>
  );
};

// Answer Node
export const ReactFlowInputAnswerNodeComponent: FC<NodeProps> = observer(
  function ReactFlowInputAnswerNodeComponent(props) {
    return (
      <ReactFlowAnswerAnimateContainer {...props}>
        <ReactFlowInputAnswerNodeComponentInner {...props} />
      </ReactFlowAnswerAnimateContainer>
    );
  }
);

const ReactFlowInputAnswerNodeComponentInner: FC<NodeProps> = (props) => {
  const [isSettingsRndOpen, setIsSettingsRndOpen] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();

  const updateKey = (key: string, v: any) => {
    props.data[key] = v;
    /*
          https://reactflow.dev/docs/api/nodes/handle/
          If you are programmatically changing the position or number of handles
          in your custom node, you need to update the node internals with the
          useUpdateNodeInternals hook.
        */
    updateNodeInternals(props.id);
  };

  const onEndsInterviewChange = () => {
    updateKey("ends_interview", props.data.ends_interview === "T" ? "F" : "T");
  };

  const onNodeTypeChange = (v: AnswerType) => {
    updateKey("label", null);
    updateKey("answerType", v);
  };

  useEffect(() => {
    updateNodeInternals(props.id);
  }, [props.data.ends_interview, updateNodeInternals]);

  const nodeType: AnswerType = props.data.answerType;

  const getAnswerTypeIcon = () => {
    if (nodeType === "free") return typeTextIcon;
    else return multipleChoiceIcon;
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ left: "50%", borderRadius: 50 }}
      />
      {props.data.ends_interview === "F" && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ left: "50%", borderRadius: 50 }}
        />
      )}
      {/* <span style={{ fontStyle: 'italic', textAlign: 'start', width: '100%', background: 'rgb(69, 65, 65)', padding: '.35em', borderRadius: '.4em', color: 'white', display: 'flex', marginBottom: '.3em' }}>
            {questionType === 'fixed' ? 'Fixed Answer' : 'Free Answer'}
        </span> */}
      <div
        style={{
          display: "grid",
          gap: ".5em",
          gridTemplateColumns: "auto 20px 20px 20px 20px auto",
          width: "100%",
          justifyItems: "baseline",
          padding: ".2em",
          borderRadius: "5px",
          alignItems: "center",
          color: "white",
          fontSize: "1em",
        }}
      >
        <span style={{ fontWeight: 600 }}>{MobxI18n.t.answer}</span>
        {/* <div style={{ display: 'flex', flexDirection: 'column', gap: '.25em', marginRight: '.5em' }} onClick={() => onSetQuestionTypeChange(questionType === 'free' ? 'fixed' : 'free')}>
                <div style={{ borderRadius: '50%', width: '15px', height: '15px', background: questionType === 'fixed' ? '#7e7eff' : 'rgb(115 111 111)' }} title="multiple" />
                <div style={{ borderRadius: '50%', width: '15px', height: '15px', background: questionType === 'free' ? '#7e7eff' : 'rgb(115 111 111)' }} title="free" />
            </div> */}

        <img width="20px" src={getAnswerTypeIcon()}></img>
        <input
          type="checkbox"
          onChange={() =>
            onNodeTypeChange(nodeType === "free" ? "fixed" : "free")
          }
          checked={nodeType === "fixed" || false}
        />

        <img width="20px" src={finishDarkIcon}></img>
        <input
          type="checkbox"
          onChange={onEndsInterviewChange}
          checked={props.data.ends_interview === "T" || false}
        />
        <StyledButton
          buttonSize="22"
          type="only-icon"
          onClick={() => {
            setIsSettingsRndOpen((p) => !p);
          }}
          icon={connectorDarkIcon}
        />
      </div>
      {isSettingsRndOpen && (
        <Portal portalRoot={document.getElementById("flex-app")}>
          <ResizableDraggableDialog
            defaultWidth={1000}
            defaultHeight={600}
            headerIconSrc={cameraLayout10Icon}
            headerText="Partition Status"
            onCloseButton={() => setIsSettingsRndOpen(false)}
          >
            <InputAnswerNodeSettings
              {...props}
              closeRnd={() => setIsSettingsRndOpen(false)}
            />
          </ResizableDraggableDialog>
        </Portal>
      )}
      <LabelInputField {...props} disabled={nodeType === "free"} />
      <div style={{ display: "flex", alignItems: "center", gap: ".5em" }}>
        {(props.data.agencies as AgencyIncidentTypeAreaModel[]).map((v) => {
          const name = agenciesStore.agencies?.[v.agencyID]?.shortname;
          if (!name) return null;
          return (
            <div
              style={{
                background: "#891f1f",
                borderRadius: ".5em",
                padding: ".5em",
                color: "white",
              }}
              key={v.agencyID}
            >
              {name}
            </div>
          );
        })}
      </div>
    </>
  );
};

export const ReactFlowAnswerNodeComponent: FC<NodeProps> = (props) => {
  return (
    <ReactFlowAnswerAnimateContainer {...props}>
      <ReactFlowAnswerNodeComponentInner {...props} />
    </ReactFlowAnswerAnimateContainer>
  );
};

const ReactFlowAnswerAnimateContainer: FC<NodeProps> = (props) => {
  const shouldAnimate = props.data?.animate;

  const base =
    props.data.ends_interview === "T"
      ? "react-flow-answer-ends-interview"
      : "react-flow-answer-node-bg";

  const classIndex = useValuesBetweenInterval({
    ms: 700,
    valueA: "1",
    valueB: "2",
    disabled: !shouldAnimate,
  });
  const classN = `${base}-${shouldAnimate ? classIndex : 1}`;
  return (
    <div
      className={`react-flow-shared-styles react-flow__node-output react-flow-answer-node ${classN}`}
      style={
        props.data?.answered ? { background: "purple", color: "white" } : {}
      }
    >
      {props.children}
    </div>
  );
};

const ReactFlowAnswerNodeComponentInner: FC<NodeProps> = (props) => {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ left: "50%", borderRadius: 50 }}
      />
      {!props.data.isLeaf && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ left: "50%", borderRadius: 50 }}
        />
      )}
      {props.data?.label ? (
        <>
          <div>{props.data.label}</div>
        </>
      ) : (
        <>
          <LabelInputField
            {...props}
            labelKey="newLabel"
            disabled={!props.data?.animate}
          />
        </>
      )}
    </>
  );
};

// Answer Node Settings
const InputAnswerNodeSettings: FC<NodeProps & { closeRnd: () => void }> =
  observer(({ closeRnd, ...props }) => {
    const updateNodeInternals = useUpdateNodeInternals();

    const onAgencyAddition = (targetAgency: AgencyIncidentTypeAreaModel) => {
      const alreadyIncluded = props.data.agencies.some(
        (v) =>
          v.agency_id === targetAgency.agencyID &&
          v.incident_treepath === targetAgency.typeTreePath
      );
      if (alreadyIncluded) return;

      props.data.agencies = [...props.data.agencies, targetAgency];
      updateNodeInternals(props.id);
    };

    const onDeleteHandler = (agencyID: number) => {
      const newArr = props.data.agencies.filter(
        (v: AgencyIncidentTypeAreaModel) => {
          const result = v.agencyID !== agencyID;
          return result;
        }
      );

      props.data.agencies = newArr;
      updateNodeInternals(props.id);
    };

    return (
      <div
        style={{
          background: "#0d131f",
          border: "1px solid green",
          padding: "1em",
        }}
      >
        <span className="labels">
          {MobxI18n.t.node}: {props.id}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".5em",
            padding: "1em",
          }}
        >
          <SelectedIncidentTypes
            types={(
              props.data.agencies as AgencyIncidentTypeAreaModel[]
            ).reduce((prev, acc) => {
              const { agency, type } = getIncidentTypeAreaModel(
                acc.agencyID,
                acc.typeTreePath,
                agenciesStore.agencies
              );

              return [
                ...prev,
                {
                  agencyAbbrev: agency.abbreviation.toLowerCase(),
                  agencyID: agency.id,
                  typeName: type.name,
                },
              ];
            }, [])}
            onDeleteClickHandler={(v) => {
              onDeleteHandler(v.agencyID);
            }}
          />
        </div>
        <IncidentTypesViewGeneric
          targetAgency="all"
          onTypeClick={(clickedType) => {
            const foundAgency: AgencyIncidentTypeAreaModel =
              props.data.agencies.find((v: AgencyIncidentTypeAreaModel) => {
                return v.agencyID === clickedType.agency.id;
              });

            const obj = {
              typeID: clickedType.typeID,
              agencyID: clickedType.agency.id,
              agencyAbbrev: foundAgency.agencyAbbrev,
              typeName: clickedType.name,
              typeTreePath: clickedType.typeTreePath,
              area: { id: null, name: null },
            } as any;

            if (foundAgency) {
              onDeleteHandler(obj.agencyID);
              if (
                foundAgency.agencyID === clickedType.agency.id &&
                foundAgency.typeTreePath === clickedType.typeTreePath
              )
                return;
            }

            onAgencyAddition(obj);
          }}
        />
        <button onClick={closeRnd}>{MobxI18n.t.close}</button>
      </div>
    );
  });

interface JsonTreeProps {
  data: any;
  indent?: number;
}

const INDENT_SIZE = 16;

export const UserFriendlyJsonTree: FC<JsonTreeProps> = ({
  data,
  indent = 0,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const getDataType = (value: any): string => {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  };

  const formatValue = (value: any): string => {
    if (value === null) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string") return `"${value}"`;
    return String(value);
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (typeof data !== "object" || data === null) {
    const dataType = getDataType(data);
    return (
      <div
        className={`json-leaf json-${dataType}`}
        style={{ paddingLeft: indent }}
      >
        {formatValue(data)}
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries = Object.entries(data);
  const isEmpty = entries.length === 0;

  return (
    <div
      className={`json-node ${
        isArray ? "json-node-array" : "json-node-object"
      }`}
      style={{ paddingLeft: indent }}
    >
      <div
        className="json-node-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className={`json-expand-icon ${!collapsed ? "expanded" : ""}`}>
          ▶
        </span>
        <span
          className={`json-type-badge ${
            isArray ? "json-type-array" : "json-type-object"
          }`}
        >
          {isArray ? "Array" : "Object"}
        </span>
        <span className="json-count">
          {entries.length} {entries.length === 1 ? "item" : "items"}
        </span>
      </div>

      {!collapsed && (
        <div className="json-children">
          {isEmpty ? (
            <div className="json-empty">
              {isArray ? "Empty array" : "Empty object"}
            </div>
          ) : (
            entries.map(([key, value], index) => {
              const dataType = getDataType(value);
              const isExpandable =
                dataType === "object" || dataType === "array";

              return (
                <div key={index} className="json-key-value">
                  <span className="json-key">
                    {isArray ? `[${key}]` : formatKey(key)}:
                  </span>
                  {isExpandable ? (
                    <UserFriendlyJsonTree data={value} indent={0} />
                  ) : (
                    <span className={`json-leaf json-${dataType}`}>
                      {formatValue(value)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

interface FullscreenViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const FullscreenViewer: FC<FullscreenViewerProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Portal portalRoot={document.getElementById("flex-app")}>
      <ResizableDraggableDialog
        defaultWidth={600}
        defaultHeight={400}
        headerText={title}
        onCloseButton={onClose}
      >
        Test
        {/* {children} */}
      </ResizableDraggableDialog>
    </Portal>
  );
};

interface FullscreenTextViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export const FullscreenTextViewer: FC<FullscreenTextViewerProps> = ({
  isOpen,
  onClose,
  title,
  content,
  readOnly = true,
  onChange,
}) => {
  return (
    <FullscreenViewer isOpen={isOpen} onClose={onClose} title={title}>
      <textarea
        value={content}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className="fullscreen-textarea"
        placeholder={
          readOnly ? "No content to display" : "Enter your text here..."
        }
      />
    </FullscreenViewer>
  );
};

interface FullscreenJsonViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  JsonTreeComponent: React.ComponentType<{ data: any }>;
}

export const FullscreenJsonViewer: FC<FullscreenJsonViewerProps> = ({
  isOpen,
  onClose,
  title,
  data,
  JsonTreeComponent,
}) => {
  return (
    <FullscreenViewer isOpen={isOpen} onClose={onClose} title={title}>
      <div className="fullscreen-json-container">
        <div className="json-tree-fullscreen">
          {data ? (
            <JsonTreeComponent data={data} />
          ) : (
            <div className="fullscreen-no-data">No JSON data to display</div>
          )}
        </div>
      </div>
    </FullscreenViewer>
  );
};
