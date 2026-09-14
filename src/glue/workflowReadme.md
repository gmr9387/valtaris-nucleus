# Valtaris Glue — Workflow Subsystem Documentation

This document provides a complete architectural overview of the Glue Workflow subsystem inside **valtara-nucleus**.

It covers:

- Workflow runtime architecture  
- UI composition  
- Routing  
- Theme system  
- File map  
- Developer onboarding  
- How all components fit together  

---

## 1. Overview

The Glue Workflow subsystem provides:

- deterministic workflow execution  
- workflow instance tracking  
- step‑state visualization  
- workflow browsing  
- workflow editing (separate subsystem)  
- complete UI + runtime integration  

The subsystem is fully modular and can be mounted anywhere in the Nucleus application.

---

## 2. Architecture

### **Runtime Layer**
Located in:

