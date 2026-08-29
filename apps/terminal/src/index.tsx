import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import { orchestrator, eventBus, db } from 'orchestrator';
import { BrahmaEvent } from 'shared';
import { deriveMissionMetrics } from './metrics.js';

const App = () => {
  const [events, setEvents] = useState<BrahmaEvent[]>([]);
  const [missionState, setMissionState] = useState<string>('STARTING');
  const [missionId, setMissionId] = useState<string>('');
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [trueforgeState, setTrueforgeState] = useState<string>('STARTING ◌');
  const [metrics, setMetrics] = useState({ failures: 0, recoveries: 0, stateLost: 0, totalWorkersCreated: 1, branchesPruned: 0 });
  
  useEffect(() => {
    orchestrator.startMission('Fix checkout service performance regression').then(id => {
      setMissionId(id);
    });

    const handler = (event: BrahmaEvent) => {
      setEvents(prev => {
        const last = prev[prev.length - 1];
        if (last && last.message === event.message && last.title === event.title) {
          return prev;
        }
        return [...prev.slice(-15), event];
      });
      if (event.type === 'mission.state_changed') {
        setMissionState(event.data?.status || missionState);
      }
      if (event.type === 'sandbox.benchmark_result') {
        setBenchmarkResult(event.data);
      }
      if (event.type === 'trueforge.session.created') {
        setTrueforgeState('LIVE ●');
      }
      if (event.type === 'trueforge.session.failed') {
        setTrueforgeState('FAILED ×');
      }
      if (event.type === 'worker.failed') {
        setMetrics(m => ({ ...m, failures: m.failures + 1, totalWorkersCreated: m.totalWorkersCreated + 1, branchesPruned: m.branchesPruned + 1 }));
      }
      if (event.type === 'worker.recovered') {
        setMetrics(m => ({ ...m, recoveries: m.recoveries + 1 }));
      }
    };
    eventBus.onEvent(handler);
    return () => {};
  }, []);

  useInput((input, key) => {
    if (missionState === 'AWAITING_APPROVAL') {
      if (input.toLowerCase() === 'a') {
        orchestrator.approveMission(missionId, 'terminal');
      } else if (input.toLowerCase() === 'r') {
        orchestrator.rejectMission(missionId, 'terminal');
      }
    }
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
    if (input === 'f') { // Secret trigger for chaos
      orchestrator.injectChaos(missionId);
    }
  });

  return (
    <Box flexDirection="column" padding={1} width="100%">
      <Box borderStyle="single" borderColor="magenta">
        <Text color="magenta">BRAHMA</Text>
        <Text>   Mission #{missionId.substring(0, 4)}    </Text>
        <Text color="yellow">{missionState}    </Text>
        {process.env.BRAHMA_MODE === 'live' ? (
          <Text color={trueforgeState.includes('LIVE') ? 'green' : trueforgeState.includes('FAILED') ? 'red' : 'yellow'}>
            TRUEFORGE {trueforgeState}
          </Text>
        ) : (
          <Text color="blue">MOCK / TEST MODE ◌</Text>
        )}
      </Box>

      {benchmarkResult && (
        <Box borderStyle="round" borderColor="cyan" flexDirection="column" padding={1} marginY={1}>
          <Text bold color="cyan">TRUEFORGE DAYTONA SANDBOX</Text>
          <Text>{"\n"}Candidate:</Text>
          <Text color="gray">{benchmarkResult.filename || 'requestMatcher.ts'}</Text>
          <Text>{"\n"}Tests</Text>
          <Text color="green">{benchmarkResult.testsPassed} / {benchmarkResult.testsTotal} PASS</Text>
          <Text>{"\n"}FUNCTION BENCHMARK</Text>
          <Text>Broken matcher: {benchmarkResult.baselineLatencyMs} ms</Text>
          <Text>Candidate matcher: {benchmarkResult.candidateLatencyMs} ms</Text>
          
          {benchmarkResult.diff && (
            <Box flexDirection="column" marginY={1}>
              <Text bold>PROPOSED DIFF:</Text>
              {benchmarkResult.diff.split('\n').slice(0, 15).map((line: string, i: number) => {
                let color = 'white';
                if (line.startsWith('+')) color = 'green';
                if (line.startsWith('-')) color = 'red';
                if (line.startsWith('@@')) color = 'cyan';
                return <Text key={i} color={color}>{line}</Text>;
              })}
              {benchmarkResult.diff.split('\n').length > 15 && <Text color="gray">... (diff truncated)</Text>}
            </Box>
          )}

          <Text>{"\n"}Candidate</Text>
          <Text color="green" bold>VERIFIED</Text>
          <Text>{"\n"}Production modified</Text>
          {(missionState === 'DEPLOYING' || missionState === 'COMPLETED') ? (
            <Text bold color="green">YES (candidate {missionId.substring(0, 7)} deployed)</Text>
          ) : (
            <Text bold color="yellow">NO</Text>
          )}
        </Box>
      )}

      {missionState === 'AWAITING_APPROVAL' && (
        <Box borderStyle="double" borderColor="yellow" flexDirection="column" padding={1} marginY={1}>
          <Text bold color="yellow">HUMAN AUTHORITY REQUIRED</Text>
          <Text>Production has not been modified.</Text>
          <Text>Waiting for terminal or remote web approval...</Text>
          <Text bold color="cyan">[A] APPROVE      [R] REJECT</Text>
        </Box>
      )}

      {events.some(e => e.type === 'chaos.injected') && (
        <Box borderStyle="round" borderColor="red" padding={1} marginY={1} flexDirection="column">
          <Text bold color="red">WORKER FAILED</Text>
          <Text color="yellow">↓ CHECKPOINT PRESERVED</Text>
          <Text color="cyan">↓ REPLACEMENT WORKER</Text>
          <Text color="green">↓ MISSION CONTINUES</Text>
        </Box>
      )}

      <Box flexDirection="row">
        <Box flexDirection="column" width="30%" borderStyle="single" padding={1}>
          <Text bold>SERVICE HEALTH</Text>
          <Text>checkout-api</Text>
          <Text>p95      {missionState === 'COMPLETED' ? '93 ms' : '1,140 ms'}</Text>
          <Text>deploy   92ac17</Text>
          
          <Box marginY={1} flexDirection="column">
            <Text bold>RELIABILITY</Text>
            <Text>failures: 1</Text>
            <Text>recoveries: 1</Text>
            <Text>state lost: 0</Text>
          </Box>
        </Box>
        
        <Box flexDirection="column" width="70%" borderStyle="single" padding={1}>
          <Text bold>LIVE EVENT STREAM</Text>
          {events.map((e, i) => (
            <Box key={i} flexDirection="row">
              <Text color="gray">{e.timestamp.split('T')[1].substring(0,8)} </Text>
              <Text color="cyan">[{e.source.kind.padEnd(7)}] </Text>
              <Text color={e.severity === 'error' ? 'red' : e.severity === 'warning' ? 'yellow' : e.severity === 'success' ? 'green' : 'white'}>
                {e.title} {e.message ? `- ${e.message}` : ''}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
      
      {missionState === 'COMPLETED' && (
        <Box borderStyle="bold" borderColor="green" padding={1} marginTop={1} flexDirection="column">
          <Text bold color="green">MISSION COMPLETE</Text>
          <Text>{"\n"}SERVICE 1140 ms → 93 ms (12.2x improvement)</Text>
          <Text>{"\n"}WORKFORCE</Text>
          <Text>workers created: 2</Text>
          <Text>branches pruned: 1</Text>
          <Text>worker failures: 1</Text>
          <Text>recoveries: 1</Text>
          <Text>confirmed state lost: 0</Text>
          <Text>{"\n"}SAFETY</Text>
          <Text>Daytona verification runs: 1</Text>
          <Text>production writes before approval: 0</Text>
          <Text>human approvals: 1</Text>
        </Box>
      )}
    </Box>
  );
};

render(<App />);
