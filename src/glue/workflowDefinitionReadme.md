# Workflow Definition Subsystem (Glue)

The Workflow Definition subsystem provides the full authoring pipeline for
Valtaris Glue workflow definitions. It includes:

- strongly typed workflow definition models  
- validation  
- loading from Supabase  
- publishing to Supabase  
- in-memory registry  
- reactive editor state  
- React context  
- controller  
- UI components  
- routing + router integration  

This document explains each layer and how they fit together.

---

## 1. Types (Swap 74)

`workflowDefinitionTypes.ts` defines the core types:

- `WorkflowDefinition`
- `WorkflowStepDefinition`
- `WorkflowInputDefinition`
- `WorkflowOutputDefinition`
- `WorkflowValidationResult`

These types form the backbone of the entire subsystem.

---

## 2. Validator (Swap 75)

`workflowDefinitionValidator.ts` performs deterministic validation:

- required fields  
- unique step IDs  
- valid branching  
- valid input/output types  

Used by loader, publisher, registry, and editor state.

---

## 3. Loader (Swap 76)

`workflowDefinitionLoader.ts` loads workflow definitions from Supabase:

- fetch  
- parse  
- validate  
- return structured result  

This is the backend entrypoint for definition retrieval.

---

## 4. Publisher (Swap 77)

`workflowDefinitionPublisher.ts` publishes workflow definitions:

- validate  
- increment version  
- write to Supabase  
- return structured result  

This is the backend entrypoint for definition persistence.

---

## 5. Registry (Swap 78)

`workflowDefinitionRegistry.ts` is the in-memory authoritative store:

- caches definitions  
- provides lookup  
- integrates loader + publisher  
- supports version history  

Used by controller and service.

---

## 6. Editor State (Swap 79)

`workflowDefinitionEditorState.ts` is the reactive editing engine:

- holds current definition  
- tracks dirty state  
- tracks validation  
- supports undo/redo  
- supports step selection  
- integrates registry publishing  

This is the core of the editor UI.

---

## 7. Context (Swap 80)

`workflowDefinitionContext.tsx` provides global editor state:

- wraps editor state  
- exposes typed hook  
- used by all editor UI components  

---

## 8. Controller (Swap 81)

`workflowDefinitionController.ts` orchestrates:

- loading definitions  
- initializing editor provider  
- binding registry + context  

This is the top-level logic wrapper for the editor.

---

## 9. Service (Swap 82)

`workflowDefinitionService.ts` provides high-level operations:

- load  
- publish  
- validate  
- list  
- clear registry  

Used by controller and external systems.

---

## 10. Main View (Swap 83)

`workflowDefinitionView.tsx` renders the editor layout:

- toolbar  
- sidebar  
- step editor  
- validation status  
- dirty indicator  

---

## 11. Editor Entry Point (Swap 84)

`workflowDefinitionEditor.tsx` binds:

- controller  
- main view  

This is the public entrypoint for routing.

---

## 12. Step Editor (Swap 85)

`workflowDefinitionStepEditor.tsx` edits:

- name  
- description  
- action  
- inputs  
- outputs  
- branching  

---

## 13. Sidebar (Swap 86)

`workflowDefinitionSidebar.tsx` provides:

- step list  
- step selection  
- add/remove steps  
- validation indicators  

---

## 14. Toolbar (Swap 87)

`workflowDefinitionToolbar.tsx` provides:

- publish  
- undo/redo  
- validation summary  
- dirty indicator  

---

## 15. Routes (Swap 88)

`workflowDefinitionRoutes.ts` defines:

