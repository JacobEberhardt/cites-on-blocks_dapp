import React, { Component } from 'react'
import { Button, Box, CheckBox, Headline, Label } from 'grommet'
import Spinning from 'grommet/components/icons/Spinning'
import PropTypes from 'prop-types'
import local from '../../localization/localizedStrings'
import Table from 'grommet/components/Table'
import TableRow from 'grommet/components/TableRow'
import FlagIconFactory from 'react-flag-icon-css'
import { utils } from 'web3'
import '../../css/whitelist.css'

class WhitelistModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      addresses: [],
      selectedAddresses: [],
      statuses: [],
      isLoading: true
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.dataKeyAddresses in this.props.PermitFactory.getCountry) {
      const addresses = this.props.PermitFactory.getCountry[
        this.props.dataKeyAddresses
      ].value
      if (addresses !== prevState.addresses) {
        this.setState({
          addresses,
          isLoading: false
        })
        this.getWhitelistStatuses(addresses)
      } else {
        this.getWhitelistStatuses(addresses)
      }
    }
  }

  removeAddressFromWhitelist(address) {
    if (utils.isAddress(address)) {
      this.props.Contracts.PermitFactory.methods.removeAddress.cacheSend(
        address,
        {
          from: this.props.accounts[0]
        }
      )
    }
  }

  addAddressToWhitelist(address) {
    if (utils.isAddress(address)) {
      this.props.Contracts.PermitFactory.methods.addAddress.cacheSend(
        address,
        utils.asciiToHex(this.props.country.value),
        {
          from: this.props.accounts[0]
        }
      )
    }
  }

  isAddressSelected() {
    let isSelected =
      this.state.selectedAddresses !== undefined &&
      this.state.selectedAddresses.length !== 0
    return isSelected
  }

  removeAllSelected() {
    if (this.isAddressSelected()) {
      this.props.Contracts.PermitFactory.methods.removeAddresses.cacheSend(
        this.state.selectedAddresses,
        {
          from: this.props.accounts[0]
        }
      )
    }
  }

  checkBoxStateDidChange(address) {
    let addresses = this.state.selectedAddresses
    if (!this.state.selectedAddresses.includes(address)) {
      addresses.push(address)
    } else {
      addresses.splice(addresses.indexOf(address), 1)
    }
    this.setState({ selectedAddresses: addresses })
  }

  async getWhitelistStatuses(addresses) {
    const { Contracts } = this.props
    if (addresses && addresses.length > 0) {
      try {
        const statuses = await Promise.all(
          addresses.map(address =>
            Contracts.PermitFactory.methods.whitelist(address).call()
          )
        )
        this.setState({ statuses })
      } catch (error) {
        console.error(error)
      }
    }
  }

  render() {
    let removeAddressesHandler = this.isAddressSelected()
      ? this.removeAllSelected.bind(this)
      : undefined
    const FlagIcon = FlagIconFactory(React, { useCssModules: false })
    let rows
    if (this.state.addresses !== undefined) {
      if (this.state.addresses.length > 0) {
        rows = this.state.addresses.map((data, index) => {
          return (
            <TableRow key={index}>
              {this.props.isOwner && (
                <td>
                  {this.state.statuses[index] && (
                    <CheckBox
                      onChange={this.checkBoxStateDidChange.bind(this, data)}
                    />
                  )}
                </td>
              )}
              <td>{index + 1}</td>
              <td>{data}</td>
              <td>
                {this.state.statuses[index]
                  ? local.whitelist.whitelisted
                  : local.whitelist.notWhitelisted}
              </td>
              {this.props.isOwner && (
                <td>
                  {this.state.statuses[index] ? (
                    <Button
                      primary={true}
                      onClick={this.removeAddressFromWhitelist.bind(this, data)}
                      label={local.whitelist.remove}
                    />
                  ) : (
                    <Button
                      primary={true}
                      onClick={this.addAddressToWhitelist.bind(this, data)}
                      label={local.whitelist.add}
                    />
                  )}
                </td>
              )}
            </TableRow>
          )
        })
      } else {
        rows = null
      }
    } else {
      rows = null
    }

    return (
      <main>
        <Box align="center" full={true} pad="small">
          <Headline className="headline" align="center" tag="h2">
            {this.props.country.name}
          </Headline>
          <Box direction="row" pad="none" margin="none">
            <Box pad="small" align="center" margin="none">
              <Label>
                {local.whitelist.table.language}:
                <FlagIcon
                  code={this.props.country.value.toLowerCase()}
                  size="lg"
                />
              </Label>
              <Label>
                {local.whitelist.table.entry}: {this.props.country.entry}
              </Label>
            </Box>
            <Box pad="small" align="center" margin="none">
              <Label>
                {local.whitelist.table.iso}: {this.props.country.value}
              </Label>
              <Label>
                {local.whitelist.table.joining}: {this.props.country.join}
              </Label>
            </Box>
          </Box>
          {this.state.isLoading ? (
            <Spinning size="large" />
          ) : (
            <Box full={true} align="center" margin="medium">
              <Table responsive={false}>
                <thead>
                  <tr>
                    {this.props.isOwner && <th />}
                    <th>{local.whitelist.layer.number}</th>
                    <th>{local.whitelist.layer.publicID}</th>
                    <th>{local.whitelist.status}</th>
                    {this.props.isOwner && <th />}
                  </tr>
                </thead>
                <tbody>{rows}</tbody>
              </Table>
              {this.props.isOwner && (
                <Button
                  primary={true}
                  onClick={removeAddressesHandler}
                  label={local.whitelist.removeSelected}
                />
              )}
            </Box>
          )}
        </Box>
      </main>
    )
  }
}

WhitelistModal.propTypes = {
  getCountry: PropTypes.func,
  PermitFactory: PropTypes.object,
  accounts: PropTypes.object,
  Contracts: PropTypes.object,
  country: PropTypes.object,
  dataKeyAddresses: PropTypes.string,
  isOwner: PropTypes.bool
}

export default WhitelistModal
