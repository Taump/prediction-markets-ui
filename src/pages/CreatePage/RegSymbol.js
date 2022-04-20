import React, { useState, useEffect, useRef } from "react";
import { Typography, Steps, Input, Form, Button, Space } from "antd";
import client from "services/obyte";
import { isBoolean } from "lodash";
import { generateLink } from "utils/generateLink";
import { useWindowSize } from "hooks/useWindowSize.js";
import { useSelector } from "react-redux";
import QRButton from "obyte-qr-button";

const { Text } = Typography;
const { Step } = Steps;

const reservedTokens = ["GBYTE", "MBYTE", "KBYTE", "BYTE"];

const initStateValue = {
  value: "",
  valid: false,
};

const tokenRegistry = client.api.getOfficialTokenRegistryAddress();

export const RegisterSymbols = () => {
  const order = useSelector((state) => state.settings.creationOrder);

  let initCurrentStep = 0;

  if (order.yes_asset && !order.yes_symbol) {
    initCurrentStep = 0;
  } else if (order.no_asset && !order.no_symbol) {
    initCurrentStep = 1;
  } else if (order.draw_asset && !order.draw_symbol) {
    initCurrentStep = 2;
  }

  const [width] = useWindowSize();
  const [currentStep, setCurrentStep] = useState(initCurrentStep);
  const currentSymbol = initCurrentStep === 0 ? 'yes' : (initCurrentStep === 1 ? 'no' : 'draw');

  const [isAvailable, setIsAvailable] = useState(undefined);
  const [symbolByCurrentAsset, setSymbolByCurrentAsset] = useState(undefined);
  const [token, setToken] = useState(initStateValue);
  const [tokenSupport, setTokenSupport] = useState(initStateValue);
  const [descr, setDescr] = useState(initStateValue);


  const checkRef = useRef(null);
  const regRef = useRef(null);
  const symbolInputRef = useRef(null);

  const currentAsset = order[currentSymbol + "_asset"];

  const currentDecimals = 9; // TODO: Изменить на децималс резерва

  useEffect(() => {
    if (!order.yes_symbol && !order.yes_symbol_req) {
      setCurrentStep(0);
    } else if (!order.no_symbol && !order.no_symbol_req) {
      setCurrentStep(1);
    } else if (order.draw_asset && !order.draw_symbol && !order.draw_symbol_req) {
      setCurrentStep(2);
    }
  }, [order]);

  useEffect(() => {
    setIsAvailable(undefined);
    setToken(initStateValue);
    setTokenSupport(initStateValue);
    setDescr(initStateValue);
    (async () => {
      const symbol = await client.api.getSymbolByAsset(
        tokenRegistry,
        currentAsset
      );
      if (symbol !== currentAsset.replace(/[+=]/, "").substr(0, 6)) {
        setSymbolByCurrentAsset(symbol);
      } else {
        setSymbolByCurrentAsset(null);
      }
    })();
  }, [currentStep, setSymbolByCurrentAsset, currentAsset]);

  useEffect(() => {
    if (isAvailable === null) {
      (async () => {
        const asset = await client.api.getAssetBySymbol(
          tokenRegistry,
          token.value
        );
        if (!!asset) {
          setIsAvailable(false);
        } else {
          setIsAvailable(true);

          setDescr({
            value: `${String(currentSymbol).toUpperCase()}-token for event: «${order.data.event}»`,
            valid: true,
          });

          setTokenSupport({ value: "0.1", valid: true })
        }
      })();
      symbolInputRef?.current.blur();
    } else if (isAvailable === undefined) {
      symbolInputRef?.current.focus({
        cursor: 'end',
      });
    }
  }, [isAvailable, currentSymbol]);

  const data = {
    asset: currentAsset,
    symbol: token.value,
    decimals:
      (isAvailable && !symbolByCurrentAsset && currentDecimals) || undefined,
    description:
      (isAvailable && descr.valid && !symbolByCurrentAsset && descr.value) ||
      undefined,
  };

  const handleChangeSymbol = (ev) => {
    const targetToken = ev.target.value.toUpperCase();
    // eslint-disable-next-line no-useless-escape
    const reg = /^[0-9A-Z_\-]+$/;
    if (reg.test(targetToken) || !targetToken) {
      if (targetToken.length > 0) {
        if (targetToken.length <= 40) {
          if (reservedTokens.find((t) => targetToken === t)) {
            setToken({ ...token, value: targetToken, valid: false });
          } else {
            setToken({ ...token, value: targetToken, valid: true });
          }
        } else {
          setToken({
            ...token,
            value: targetToken,
            valid: false,
          });
        }
      } else {
        setToken({ ...token, value: targetToken, valid: false });
      }
      setIsAvailable(undefined);
      setTokenSupport(initStateValue);
      setDescr(initStateValue);
    }
  };
  const handleChangeSupport = (ev) => {
    const support = ev.target.value;
    const reg = /^[0-9.]+$/;
    const f = (x) =>
      ~(x + "").indexOf(".") ? (x + "").split(".")[1].length : 0;
    if (support) {
      if (reg.test(support) && f(support) <= 9) {
        if (Number(support) >= 0.1) {
          setTokenSupport({ ...token, value: support, valid: true });
        } else {
          setTokenSupport({ ...token, value: support, valid: false });
        }
      }
    } else {
      setTokenSupport({ ...token, value: "", valid: false });
    }
  };
  const handleChangeDescr = (ev) => {
    const { value } = ev.target;
    if (value.length < 140) {
      setDescr({ value, valid: true });
    } else {
      setDescr({ value, valid: false });
    }
  };

  let helpSymbol = undefined;
  if (isBoolean(isAvailable)) {
    if (isAvailable) {
      helpSymbol = `Symbol name ${token.value} is available, you can register it`;
    } else {
      helpSymbol = "This token name is already taken.";
    }
  }

  const clickOnRegBtn = (ev) => {
    if (ev.key === "Enter") {
      if (token.valid && descr.valid && tokenSupport.valid) {
        regRef.current.click();
      }
    }
  }

  return (
    <div>
      <Steps
        current={currentStep}
        style={{ marginTop: 20 }}
        direction={width > 800 ? "horizontal" : "vertical"}
      >
        <Step title="Symbol for YES-token" />
        <Step title="Symbol for NO-token" />
        {order.draw_asset && <Step title="Symbol for DRAW-token" />}
      </Steps>

      <Form size="large" style={{ marginTop: 35 }}>
        <Form.Item
          extra={helpSymbol && <span style={{ color: isAvailable ? "green" : "red" }}>{helpSymbol}</span>}
          validateStatus={
            (isAvailable === false && "error") ||
            (isAvailable === true && "success")
          }
        >
          <Input
            placeholder="Symbol"
            allowClear
            autoFocus={true}
            ref={symbolInputRef}
            autoComplete="off"
            value={token.value}
            onChange={handleChangeSymbol}
            onKeyPress={(ev) => {
              if (ev.key === "Enter") {
                if (token.valid) {
                  checkRef.current.click();
                }
              }
            }}
          />
        </Form.Item>
        {isAvailable && (
          <Form.Item>
            <Input
              placeholder="Support (Min amount 0.1 GB)"
              suffix="GB"
              autoComplete="off"
              value={tokenSupport.value}
              onChange={handleChangeSupport}
              autoFocus={isBoolean(isAvailable)}
              onKeyPress={clickOnRegBtn}
            />
          </Form.Item>
        )}
        {isAvailable === true && !symbolByCurrentAsset && (
          <Form.Item>
            <Form.Item
              hasFeedback
            >
              <Input.TextArea
                style={{ fontSize: 16 }}
                rows={5}
                value={descr.value}
                onChange={handleChangeDescr}
                placeholder="Description of an asset (up to 140 characters)"
              />
            </Form.Item>
          </Form.Item>
        )}
        <Form.Item>
          <Space>
            {isAvailable === undefined || isAvailable === null ? (
              <Button
                onClick={() => {
                  setIsAvailable(null);
                }}
                key="btn-check"
                loading={isAvailable === null}
                disabled={token.value === "" || !token.valid}
                ref={checkRef}
              >
                Check availability
              </Button>
            ) : (
              <QRButton
                disabled={!token.valid || !tokenSupport.valid}
                key="btn-reg"
                ref={regRef}
                href={generateLink(
                  {
                    amount: Math.ceil(tokenSupport.value * 1e9),
                    data,
                    aa: tokenRegistry
                  }
                )}
              >Register
              </QRButton>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};