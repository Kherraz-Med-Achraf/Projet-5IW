declare module "gridjs-vue" {
  import { App } from "vue";

  export interface GridGlobalPlugin {
    install(app: App): void;
  }

  export const GridGlobal: GridGlobalPlugin;

  export interface GridProps {
    columns?: any[];
    data?: any[];
    search?: boolean;
    sort?: boolean;
    pagination?: any;
    language?: any;
    className?: any;
  }

  const Grid: any;
  export default Grid;
}
