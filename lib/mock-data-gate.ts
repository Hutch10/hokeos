import * as batchService from './metals/batch-service';
    import * as billingService from './billing/service';
    import * as investigationService from './investigations/service';
    import * as reportService from './reports';
    import * as tagService from './tags/tag-service';
    
    export const getBatchService = () => batchService;
    export const getBillingService = () => billingService;
    export const getInvestigationService = () => investigationService;
    export const getReportService = () => reportService;
    export const getTagService = () => tagService;
