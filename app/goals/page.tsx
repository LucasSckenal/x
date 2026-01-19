"use client";

import { Sidebar } from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import Goals from "../components/Goals/Goals";
import { useState } from "react";
import { Target, Repeat } from "lucide-react";
import styles from "./page.module.scss"; 
import AutomationsTab from "../components/AutomationsTab/AutomationsTab";


export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<"goals" | "automations">("goals");

  return (
    <div
      style={{
        display: "flex",
        background: "#0d0e10",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      {/* Sidebar Fixa */}
      <Sidebar />

      {/* Conteúdo à direita */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
        }}
      >
        <Header />

        <div
          style={{
            padding: "32px 32px 0 32px",
            maxWidth: "1600px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {/* Navegação de Tabs */}
          <div className={styles.tabsContainer}>
            <button
              className={`${styles.tabButton} ${
                activeTab === "goals" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("goals")}
            >
              <Target size={20} />
              Minhas Metas
            </button>
            <button
              className={`${styles.tabButton} ${
                activeTab === "automations" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("automations")}
            >
              <Repeat size={20} />
              Automações
            </button>
          </div>
        </div>

        <main
          style={{
            padding: "24px 32px 32px 32px",
            maxWidth: "1600px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {activeTab === "goals" ? <Goals /> : <AutomationsTab />}
        </main>
      </div>
    </div>
  );
}
