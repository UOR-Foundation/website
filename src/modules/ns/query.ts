/**
 * query: namespace — unified barrel export.
 *
 * Consolidates: sparql
 * Bridge Space — SPARQL execution, federation, and UNS query interface.
 *
 * @namespace query:
 * @version 2.0.0
 */

export { parseSparql } from "@/modules/sparql/parser";
export type { ParsedSparql, SparqlPrefix, PatternTerm, TriplePattern, FilterClause } from "@/modules/sparql/parser";
export { executeSparql } from "@/modules/sparql/executor";
export type { SparqlResult, SparqlResultRow } from "@/modules/sparql/executor";
export { federatedQuery, LOCAL_ENDPOINT, UOR_API_ENDPOINT, DEFAULT_ENDPOINTS } from "@/modules/sparql/federation";
export type { FederationEndpoint, FederatedResult, EndpointType } from "@/modules/sparql/federation";
export { default as SparqlEditorPage } from "@/modules/sparql/pages/SparqlEditorPage";
export { UnsQuery } from "@/modules/sparql/query";
export type { QueryIntent, QueryMatch, QueryResult, SparqlQueryResult } from "@/modules/sparql/query";
